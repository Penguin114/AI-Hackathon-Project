import { z } from "zod";

export const worldPromptSchema = z.strictObject({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(1200),
});

export const landmarks = [
  "pumps", "rover", "reactor", "servers", "pods", "gears", "planters", "shelves",
  "sensors", "orrery", "train", "crystals", "pipes", "bell", "vines", "tablets",
  "submersible", "shuttle", "elevator", "portal", "purifier", "seedbank", "vault", "counterweight",
] as const;

const color = z.string().regex(/^#[\da-fA-F]{6}$/);
const modelPart = z.strictObject({
  shape: z.enum(["block", "cylinder", "cone", "sphere", "ring", "arch", "crystal", "wedge", "capsule"]),
  size: z.array(z.number().min(.05).max(6)).length(3),
  at: z.array(z.number().min(-6).max(6)).length(3),
  rotate: z.array(z.number().min(-180).max(180)).length(3),
  color,
  finish: z.enum(["matte", "metal", "glass", "glow"]),
});

const roomModel = z.strictObject({
  name: z.string().trim().min(2).max(50),
  motion: z.enum(["still", "rotate", "hover"]),
  parts: z.array(modelPart).min(5).max(16),
});

const chamber = z.strictObject({
  layout: z.enum(["round", "diamond", "cross", "galleries", "junction", "annex", "corridor"]),
  landmark: z.enum(landmarks).optional(),
  model: roomModel.optional(),
  style: z.enum(["workshop", "gallery", "airlock"]),
  wall: color,
  accent: color,
});

export const worldDesignSchema = z.strictObject({
  backdrop: z.enum(["stars", "reef", "skyline", "cavern", "snow", "forest", "storm"]),
  chambers: z.array(chamber).min(2).max(4),
});

const generatedChamber = chamber.omit({landmark:true}).required({model:true});
export const generatedWorldDesignSchema = worldDesignSchema.extend({
  chambers: z.array(generatedChamber).min(2).max(4),
});

export type ChamberDesign = z.infer<typeof chamber>;
export type WorldDesign = z.infer<typeof worldDesignSchema>;
export type Landmark = (typeof landmarks)[number];
export type RoomModel = z.infer<typeof roomModel>;
