import { z } from "zod";
import { IMAGE_CHAR_LIMIT, TEXT_LIMIT } from "./limits";

const verdictName = z.enum(["scam", "suspicious", "looks_ok", "unsure"]);

export const classificationSchema = z.looseObject({
  verdict: verdictName,
  confidence: z.number().optional(),
  pattern: z.string().max(80).optional(),
  patternLabel: z.string().max(120).optional(),
  reasoning: z.array(z.string().max(500)).max(8).optional(),
  entities: z
    .looseObject({
      phones: z.array(z.string().max(40)).max(8).optional(),
      names: z.array(z.string().max(80)).max(8).optional(),
      amounts: z.array(z.string().max(40)).max(8).optional(),
      links: z.array(z.string().max(300)).max(8).optional(),
      organisations: z.array(z.string().max(80)).max(8).optional(),
    })
    .optional(),
  searchQueries: z.array(z.string().max(180)).max(4).optional(),
  headline: z.string().max(240).optional(),
});

export const verdictSchema = z.looseObject({
  verdict: verdictName,
  confidence: z.number().optional(),
  headline: z.string().max(240).optional(),
  reasoning: z.array(z.string().max(500)).max(8).optional(),
});

export const sampleSchema = z.looseObject({
  verdict: verdictName,
});

export const checkBodySchema = z
  .object({
    text: z.string().max(TEXT_LIMIT).optional(),
    imageDataUrl: z.string().max(IMAGE_CHAR_LIMIT).optional(),
    language: z.enum(["en", "tw"]).optional(),
    exampleId: z.string().max(80).optional(),
    stream: z.boolean().optional(),
    skipSearch: z.boolean().optional(),
  })
  .strict();

export const familyBodySchema = z
  .object({
    code: z.string().max(16),
    verdict: z.string().max(20),
    pattern: z.string().max(160),
  })
  .strict();

export type ErrorCode =
  | "RATE_LIMITED"
  | "BAD_INPUT"
  | "LLM_UNAVAILABLE"
  | "BUDGET_PAUSED"
  | "NOT_FOUND"
  | "INTERNAL";
