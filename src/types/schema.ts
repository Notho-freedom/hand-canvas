import { z } from "zod";

// ─── Frame ──────────────────────────────────────────────────────────────────
export const FrameSchema = z.object({
  origin: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  unit: z.string().default("m"),
  scale: z.number().positive().default(100),
  yAxis: z.enum(["up", "down"]).default("up"),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
});
export type Frame = z.infer<typeof FrameSchema>;

// ─── Anchor reference ───────────────────────────────────────────────────────
// "id.anchorName" or "id.surface" with optional t parameter
export const AnchorRefSchema = z.object({
  ref: z.string(), // e.g. "plan1.surface", "bloc1.cog", "poulie1.tangent_to:bloc1"
  t: z.number().optional(), // parametric position 0..1
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type AnchorRef = z.infer<typeof AnchorRefSchema>;

const PointOrRef = z.union([
  z.object({ x: z.number(), y: z.number() }),
  AnchorRefSchema,
]);

// ─── Component schemas ──────────────────────────────────────────────────────
const Base = {
  id: z.string(),
  rotation: z.union([z.number(), z.literal("auto")]).optional(),
  style: z
    .object({
      stroke: z.string().optional(),
      fill: z.string().optional(),
      strokeWidth: z.number().optional(),
      opacity: z.number().optional(),
    })
    .optional(),
  label: z.string().optional(),
};

export const GroundSchema = z.object({
  ...Base,
  type: z.literal("ground"),
  at: PointOrRef.optional(),
  params: z.object({
    length: z.number().positive(),
    thickness: z.number().positive().default(0.05),
  }),
});

export const WallSchema = z.object({
  ...Base,
  type: z.literal("wall"),
  at: PointOrRef.optional(),
  params: z.object({
    height: z.number().positive(),
    thickness: z.number().positive().default(0.05),
    side: z.enum(["left", "right"]).default("left"),
  }),
});

export const InclineSchema = z.object({
  ...Base,
  type: z.literal("incline"),
  anchor: PointOrRef.optional(),
  at: PointOrRef.optional(),
  params: z.object({
    angle: z.number(), // degrees
    length: z.number().positive(), // along the slope (hypotenuse)
    thickness: z.number().positive().default(0.05),
    direction: z.enum(["right", "left"]).default("right"),
  }),
});

export const BlockSchema = z.object({
  ...Base,
  type: z.literal("block"),
  anchor: PointOrRef.optional(),
  at: PointOrRef.optional(),
  params: z.object({
    w: z.number().positive(),
    h: z.number().positive(),
    mass: z.number().positive().optional(),
  }),
});

export const SphereSchema = z.object({
  ...Base,
  type: z.literal("sphere"),
  anchor: PointOrRef.optional(),
  at: PointOrRef.optional(),
  params: z.object({
    radius: z.number().positive(),
    mass: z.number().positive().optional(),
  }),
});

export const PulleySchema = z.object({
  ...Base,
  type: z.literal("pulley"),
  anchor: PointOrRef.optional(),
  at: PointOrRef.optional(),
  params: z.object({
    radius: z.number().positive(),
  }),
});

export const RopeSchema = z.object({
  ...Base,
  type: z.literal("rope"),
  from: PointOrRef,
  to: PointOrRef,
  via: z.array(PointOrRef).optional(),
  params: z
    .object({
      slack: z.number().default(0),
    })
    .optional(),
});

export const SpringSchema = z.object({
  ...Base,
  type: z.literal("spring"),
  from: PointOrRef,
  to: PointOrRef,
  params: z
    .object({
      coils: z.number().int().positive().default(8),
      width: z.number().positive().default(0.15),
    })
    .optional(),
});

export const RodSchema = z.object({
  ...Base,
  type: z.literal("rigid_rod"),
  from: PointOrRef,
  to: PointOrRef,
});

export const ForceSchema = z.object({
  ...Base,
  type: z.literal("force"),
  at: PointOrRef,
  vector: z.object({
    magnitude: z.number(),
    // Either an angle in degrees (math convention, 0 = +x, 90 = +y if yAxis up)
    // OR a named direction
    angle: z.number().optional(),
    direction: z
      .enum(["up", "down", "left", "right"])
      .optional(),
    // OR explicit components
    dx: z.number().optional(),
    dy: z.number().optional(),
  }),
  scale: z.number().positive().optional(), // px per unit magnitude
});

export const VelocitySchema = ForceSchema.omit({ type: true }).extend({
  type: z.literal("velocity"),
});
export const AccelerationSchema = ForceSchema.omit({ type: true }).extend({
  type: z.literal("acceleration"),
});

export const AxisSchema = z.object({
  ...Base,
  type: z.literal("axis"),
  at: PointOrRef,
  params: z.object({
    angle: z.number().default(0),
    length: z.number().positive().default(1),
    name: z.string().optional(), // "x'", "y'"
  }),
});

export const AngleArcSchema = z.object({
  ...Base,
  type: z.literal("angle_arc"),
  at: PointOrRef,
  params: z.object({
    from: z.number(), // start angle deg
    to: z.number(), // end angle deg
    radius: z.number().positive().default(0.4),
  }),
});

export const LabelSchema = z.object({
  ...Base,
  type: z.literal("label"),
  at: PointOrRef,
  params: z.object({
    text: z.string(),
    offset: z.object({ x: z.number(), y: z.number() }).optional(),
  }),
});

export const DimensionSchema = z.object({
  ...Base,
  type: z.literal("dimension"),
  from: PointOrRef,
  to: PointOrRef,
  params: z
    .object({
      text: z.string().optional(),
      offset: z.number().default(0.3),
    })
    .optional(),
});

export const ComponentSchema = z.discriminatedUnion("type", [
  GroundSchema,
  WallSchema,
  InclineSchema,
  BlockSchema,
  SphereSchema,
  PulleySchema,
  RopeSchema,
  SpringSchema,
  RodSchema,
  ForceSchema,
  VelocitySchema,
  AccelerationSchema,
  AxisSchema,
  AngleArcSchema,
  LabelSchema,
  DimensionSchema,
]);
export type Component = z.infer<typeof ComponentSchema>;

export const SchemaSchema = z.object({
  frame: FrameSchema,
  components: z.array(ComponentSchema),
});
export type Schema = z.infer<typeof SchemaSchema>;

export type Point = { x: number; y: number };
