// schemas.ts — Zod I/O contracts for the heartbeat skill.
// Referenced by SKILL_automate_zod.md via metadata.automate/{input,output}Schema.
import { z } from "zod";

/** The heartbeat skill takes no structured input. */
export const HeartbeatInput = z.object({}).strict();
export type HeartbeatInput = z.infer<typeof HeartbeatInput>;

/** A single Ran fact appended by whichever agent fulfilled the skill. */
export const HeartbeatOutput = z
  .object({
    id: z.string().regex(/^[0-9a-f]{12}$/, "12 hex chars, sha256 truncated"),
    at: z.string().datetime(),
    by: z.string().min(1),
    kind: z.literal("Ran"),
    payload: z
      .object({
        runner: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type HeartbeatOutput = z.infer<typeof HeartbeatOutput>;
