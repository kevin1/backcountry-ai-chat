/**
 * Chatbot for weather forecast & general knowledge over SMS.
 */

import OpenAI from "openai";
import * as z from "zod/v4";
import { smsCharacterReplacement } from "./smsCharacterReplacement";
import { env, WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { ResponseInputItem } from "openai/resources/responses/responses.js";

const phoneNumberSchema = z.string().regex(/^\+1[0-9]{10}$/);

const twilioSmsSchema = z.object({
  From: phoneNumberSchema,
  To: phoneNumberSchema,
  Body: z.string(),
});

type TwilioSMS = z.infer<typeof twilioSmsSchema>;

const coordinateSchema = z.union([z.tuple([z.number()]), z.tuple([z.int(), z.number(), z.number().optional()])]);

type Coordinate = z.infer<typeof coordinateSchema>;

const weatherToolArgsSchema = z.object({
  lat: coordinateSchema,
  lon: coordinateSchema,
  type: z.enum(["forecast", "forecastHourly"]),
});

type WeatherToolArgs = z.infer<typeof weatherToolArgsSchema>;

const nwsApiUrlSchema = z.url({ hostname: /^api\.weather\.gov$/, protocol: /^https$/ });

const nwsUnitValueSchema = z.object({
  unitCode: z.string(),
  value: z.number(),
});

// api.weather.gov schemas are not comprehensive. Mainly used to remove unnecessary fields.
const nwsPointsResponseSchema = z.object({
  forecast: nwsApiUrlSchema,
  forecastHourly: nwsApiUrlSchema,
  forecastZone: nwsApiUrlSchema,
  timeZone: z.string(),
});

const nwsForecastPeriodSchema = z.object({
  number: z.int(),
  name: z.string(),
  startTime: z.iso.datetime({ offset: true }),
  isDaytime: z.boolean(),
  temperature: z.number(),
  temperatureUnit: z.string(),
  probabilityOfPrecipitation: nwsUnitValueSchema,
  dewpoint: nwsUnitValueSchema.optional(),
  relativeHumidity: nwsUnitValueSchema.optional(),
  windSpeed: z.string(),
  windDirection: z.string(),
  shortForecast: z.string(),
  detailedForecast: z.string(),
});

const nwsGridForecastResponseSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  updateTime: z.iso.datetime({ offset: true }),
  validTimes: z.string(),
  elevation: z.object({
    unitCode: z.string(),
    value: z.number(),
  }),
  periods: z.array(nwsForecastPeriodSchema),
});

async function getModelResponse(userMessage: string, openai: OpenAI): Promise<string> {
  const now = new Date().toISOString();

  let input: OpenAI.Responses.ResponseInput = [{ role: "user", content: userMessage }];
  let response: OpenAI.Responses.Response | undefined;

  for (let i = 0; i < 10; i++) {
    // Copied from the OpenAI Playground:
    response = await openai.responses.create({
      prompt: {
        id: "pmpt_6869e3d835548193a8f58cf991c030ce06b7bf11c59935bf",
        version: "15",
        variables: {
          current_time: now,
        },
      },
      model: "gpt-5",
      reasoning: {
        effort: "low",
        summary: null,
      },
      previous_response_id: response?.id,
      input,
      text: {
        format: {
          type: "text",
        },
        // @ts-expect-error
        verbosity: "low",
      },
      tools: [
        {
          type: "function",
          description: "Fetches weather information based on latitude and longitude provided.",
          name: "get_weather",
          parameters: {
            type: "object",
            required: ["lat", "lon", "type"],
            properties: {
              lat: {
                type: "array",
                description: "Latitude coordinates as an array of numbers or a single number.",
                items: {
                  type: "number",
                  description: "A latitude coordinate.",
                },
              },
              lon: {
                type: "array",
                description: "Longitude coordinates as an array of numbers or a single number.",
                items: {
                  type: "number",
                  description: "A longitude coordinate.",
                },
              },
              type: {
                type: "string",
                enum: ["forecast", "forecastHourly"],
                description: "The type of weather information to retrieve.",
              },
            },
            additionalProperties: false,
          },
          strict: true,
        },
        {
          type: "web_search_preview",
          search_context_size: "medium",
          user_location: {
            type: "approximate",
            city: null,
            country: "US",
            region: "California",
            timezone: null,
          },
        },
        {
          type: "code_interpreter",
          container: {
            type: "auto",
          },
        },
      ],
      max_output_tokens: 64 * 1024,
      store: true,
      background: true,
    });
    // End generated code.

    let delay = 2000;
    while (response.status === "queued" || response.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, delay));
      response = await openai.responses.retrieve(response.id);
      // Exponentially increase delay to avoid Cloudflare subrequest limit.
      delay = Math.min(delay * 2, 10_000);
    }

    if (response.error !== null) {
      throw new Error(response.error.message);
    }

    input = await Promise.all(
      response.output
        .filter((responsePart) => responsePart.type === "function_call")
        .map(async (responsePart) => {
          const args = weatherToolArgsSchema.safeParse(JSON.parse(responsePart.arguments));
          const toolOutput = args.success ? await getWeatherForecast(args.data) : args.error.message;
          return {
            type: "function_call_output",
            call_id: responsePart.call_id,
            output: toolOutput,
          } satisfies ResponseInputItem.FunctionCallOutput;
        }),
    );

    if (input.length === 0) {
      return smsCharacterReplacement(response.output_text);
    }
  }

  throw new Error("Model made too many tool calls");
}

async function getWeatherForecast({ lat, lon, type }: WeatherToolArgs): Promise<string> {
  const [parsedLat, parsedLon] = [lat, lon].map(parseLatLong);

  const headers = {
    Accept: "application/ld+json",
    "User-Agent": await env.WEATHER_GOV_API_USER_AGENT.get(),
  } as const;

  const pointsResponse = await fetch(`https://api.weather.gov/points/${parsedLat},${parsedLon}`, { headers });
  if (!pointsResponse.ok) {
    return `Weather point lookup error: ${await pointsResponse.text()}`;
  }
  const parsedPointsResponse = nwsPointsResponseSchema.safeParse(await pointsResponse.json());
  if (!parsedPointsResponse.success) {
    return `Weather point parse error: ${parsedPointsResponse.error.message}`;
  }

  const forecastResponse = await fetch(parsedPointsResponse.data[type], { headers });
  if (!forecastResponse.ok) {
    return `Weather forecast lookup error: ${await forecastResponse.text()}`;
  }
  const parsedForecastResponse = nwsGridForecastResponseSchema.safeParse(await forecastResponse.json());
  if (!parsedForecastResponse.success) {
    return `Weather forecast parse error: ${parsedForecastResponse.error.message}`;
  }

  return JSON.stringify(
    {
      timeZone: parsedPointsResponse.data.timeZone,
      ...parsedForecastResponse.data,
    },
    null,
    2,
  );
}

function parseLatLong([d, m = 0, s = 0]: Coordinate): number {
  const sign = Math.sign(d);
  return sign * (Math.abs(d) + Math.abs(m) / 60 + Math.abs(s) / (60 * 60));
}

type Params = {
  requestMessage: TwilioSMS;
};

// The Workflow calls the model and sends the response SMS.
export class BackcountryAIChatWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    let responseText: string | undefined;
    try {
      responseText = await step.do(
        "call model",
        {
          retries: {
            limit: 3,
            delay: "2 minutes",
            backoff: "constant",
          },
          timeout: "60 minutes",
        },
        async () =>
          await getModelResponse(
            event.payload.requestMessage.Body,
            new OpenAI({ apiKey: await this.env.OPENAI_API_KEY.get(), maxRetries: 4 }),
          ),
      );
    } catch (e) {
      responseText = "Error calling model: " + String(e);
    }

    await step.do(
      "send sms",
      {
        retries: {
          limit: 10,
          delay: "1 second",
          backoff: "exponential",
        },
        timeout: "5 minutes",
      },
      async () => {
        const TWILIO_USERNAME_PASSWORD = await this.env.TWILIO_USERNAME_PASSWORD.get();

        const formData = new FormData();
        formData.append("To", event.payload.requestMessage.From);
        formData.append("From", event.payload.requestMessage.To);
        formData.append("Body", responseText);

        const twilioAccountId = TWILIO_USERNAME_PASSWORD.split(":")[0];
        const twilioMessagesEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountId}/Messages.json`;
        const twilioSendResponse = await fetch(twilioMessagesEndpoint, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Basic ${btoa(TWILIO_USERNAME_PASSWORD)}`,
          },
        });

        return {
          status: twilioSendResponse.status,
          body: await twilioSendResponse.json(),
        };
      },
    );

    return responseText;
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (new URL(request.url).pathname !== "/sms") {
      return new Response("Not Found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Bad Request: Method must be POST", { status: 422 });
    }

    const formData = await request.formData();
    const requestMessage = twilioSmsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!requestMessage.success) {
      return new Response(requestMessage.error.message, { status: 422 });
    }

    // Call the model asynchronously since Twilio has a 15-sec timeout for
    // webhooks and Cloudflare ctx.waitUntil has a 30-sec timeout after the
    // response is sent.
    await env.BACKCOUNTRY_AI_CHAT_WORKFLOW.create({
      id: crypto.randomUUID(),
      params: { requestMessage: requestMessage.data },
    });

    // Return empty response to indicate success.
    // This is equivalent to `new MessagingResponse().toString()` with Twilio SDK.
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  },
} satisfies ExportedHandler<Env>;
