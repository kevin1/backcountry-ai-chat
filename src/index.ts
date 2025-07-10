/**
 * Chatbot for weather forecast & general knowledge over SMS.
 */

import OpenAI from "openai";
import * as z from "zod/v4";
import { smsCharacterReplacement } from "./smsCharacterReplacement";
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";

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
  let input: OpenAI.Responses.ResponseInput = [{ role: "user", content: userMessage }];
  let response: OpenAI.Responses.Response | undefined;

  for (let i = 0; i < 10; i++) {
    // Copied from the OpenAI Playground:
    response = await openai.responses.create({
      prompt: {
        id: "pmpt_6869e3d835548193a8f58cf991c030ce06b7bf11c59935bf",
        version: "12",
      },
      model: "o3-2025-04-16",
      reasoning: {
        effort: "medium",
      },
      previous_response_id: response?.id,
      input,
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
      store: true,
    });
    // End generated code.

    input = [];
    for (const responsePart of response.output) {
      if (responsePart.type !== "function_call") {
        continue;
      }
      const args = weatherToolArgsSchema.safeParse(JSON.parse(responsePart.arguments));
      const toolOutput = args.success ? await getWeatherForecast(args.data) : args.error.message;
      input.push({
        type: "function_call_output",
        call_id: responsePart.call_id,
        output: toolOutput,
      });
    }

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
    "User-Agent": "(kevinchen.co, contact@kevinchen.co)",
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

/** https://developers.cloudflare.com/secrets-store/integrations/workers/ */
interface SecretStoreSecret {
  get(): Promise<string>;
}

export interface Env {
  OPENAI_API_KEY: SecretStoreSecret;
  TWILIO_USERNAME_PASSWORD: SecretStoreSecret;
  BACKCOUNTRY_AI_CHAT_WORKFLOW: Workflow<Params>;
}

type Params = {
  requestMessage: TwilioSMS;
};

// The Workflow calls the model and sends the response SMS.
export class BackcountryAIChatWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const responseText = await step.do(
      "call model",
      {
        retries: {
          limit: 5,
          delay: "5 second",
          backoff: "exponential",
        },
        timeout: "15 minutes",
      },
      async () => {
        const OPENAI_API_KEY = await this.env.OPENAI_API_KEY.get();

        try {
          return await getModelResponse(event.payload.requestMessage.Body, new OpenAI({ apiKey: OPENAI_API_KEY }));
        } catch (e) {
          console.error(e);
          return "Error calling model: " + String(e);
        }
      },
    );

    await step.do(
      "send sms",
      {
        retries: {
          limit: 5,
          delay: "2 second",
          backoff: "exponential",
        },
        timeout: "15 minutes",
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
      return new Response("Bad Request: Method must be POST", { status: 400 });
    }

    const requestMessage = twilioSmsSchema.safeParse(Object.fromEntries((await request.formData()).entries()));
    if (!requestMessage.success) {
      return new Response(requestMessage.error.message, { status: 400 });
    }

    // Call the model asynchronously since Twilio has a 15-sec timeout for
    // webhooks and Cloudflare ctx.waitUntil has a 30-sec timeout after the
    // response is sent.
    const workflowInstance = await env.BACKCOUNTRY_AI_CHAT_WORKFLOW.create({
      id: crypto.randomUUID(),
      params: { requestMessage: requestMessage.data },
    });
    console.log(`created workflow ${workflowInstance.id}`);

    // Return empty response to indicate success.
    // This is equivalent to `new MessagingResponse().toString()` with Twilio SDK.
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  },
} satisfies ExportedHandler<Env>;
