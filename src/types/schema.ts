import { z } from "zod";

// ─── Frame (v2: world / camera / screen) ────────────────────────────────────
// Backward-compat: legacy flat fields (origin/scale/yAxis/viewport) still accepted.
export const FrameSchema = z
  .object({
    // legacy / flat
    origin: z.object({ x: z.number(), y: z.number() }).optional(),
    unit: z.string().optional(),
    scale: z.number().positive().optional(),
    yAxis: z.enum(["up", "down"]).optional(),
    viewport: z
      .object({ x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() })
      .optional(),
    // v2
    world: z
      .object({ unit: z.string().default("m"), yAxis: z.enum(["up", "down"]).default("up") })
      .optional(),
    camera: z
      .object({ x: z.number().default(0), y: z.number().default(0), zoom: z.number().positive().default(100) })
      .optional(),
    screen: z.object({ auto: z.boolean().default(true) }).optional(),
  })
  .transform((f) => {
    // Normalize → resolved frame
    const yAxis = f.yAxis ?? f.world?.yAxis ?? "up";
    const unit = f.unit ?? f.world?.unit ?? "m";
    const scale = f.scale ?? f.camera?.zoom ?? 100;
    const origin = f.origin ?? { x: f.camera?.x ?? 0, y: f.camera?.y ?? 0 };
    const viewport = f.viewport ?? { x: -1, y: -1, w: 8, h: 5 };
    return { origin, unit, scale, yAxis, viewport };
  });
export type Frame = z.infer<typeof FrameSchema>;

// ─── Anchor reference ───────────────────────────────────────────────────────
// V2 typed union (preferred) + V1 string-ref form (legacy, normalized internally).

const PointLit = z.object({ x: z.number(), y: z.number() });

const RefLegacy = z.object({
  ref: z.string(), // "id.name" or "id.name" / "id.tangent_to:other"
  t: z.number().optional(),
  offset: PointLit.optional(),
});

const RefPoint = z.object({
  kind: z.literal("point"),
  id: z.string(),
  anchor: z.string(),
  offset: PointLit.optional(),
});
const RefCurve = z.object({
  kind: z.literal("curve"),
  id: z.string(),
  curve: z.string().default("surface"),
  t: z.number(),
  offset: PointLit.optional(),
});
const RefTangent = z.object({
  kind: z.literal("tangent"),
  from: z.string(),
  to: z.string(),
  side: z.enum(["external", "internal", "auto", "upper", "lower"]).default("auto"),
  offset: PointLit.optional(),
});
const RefFace = z.object({
  kind: z.literal("face"),
  id: z.string(),
  face: z.enum(["top", "bottom", "left", "right"]),
  align: z.enum(["center", "start", "end"]).default("center"),
  offset: PointLit.optional(),
});
const RefNormal = z.object({
  kind: z.literal("normal"),
  id: z.string(),
  length: z.number().default(0.5),
  offset: PointLit.optional(),
});
const RefBestFace = z.object({
  kind: z.literal("best_face"),
  id: z.string(),
  towards: z.string(),
  offset: PointLit.optional(),
});

export const AnchorRefSchema = z.union([
  RefPoint, RefCurve, RefTangent, RefFace, RefNormal, RefBestFace, RefLegacy,
]);
export type AnchorRef = z.infer<typeof AnchorRefSchema>;

const PointOrRef = z.union([PointLit, AnchorRefSchema]);

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
      dashed: z.boolean().optional(),
    })
    .optional(),
  label: z.string().optional(),
  autoForces: z.union([z.boolean(), z.array(z.string())]).optional(),
  physics: z
    .object({
      rigid: z.boolean().optional(),
      stretch: z.number().optional(),
      mass: z.number().optional(),
      friction: z.number().optional(),
      k: z.number().optional(),
      restLength: z.number().optional(),
    })
    .optional(),
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
    angle: z.number(),
    length: z.number().positive(),
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
  // v1: from / to / via
  from: PointOrRef.optional(),
  to: PointOrRef.optional(),
  via: z.array(PointOrRef).optional(),
  // v2: explicit path with pulley arcs
  // each entry is either a ref/point, or { wrap: "pulleyId", side?: "upper"|"lower" }
  path: z
    .array(
      z.union([
        PointOrRef,
        z.object({
          wrap: z.string(),
          side: z.enum(["upper", "lower", "auto"]).default("auto"),
        }),
      ]),
    )
    .optional(),
  params: z.object({ slack: z.number().default(0) }).optional(),
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
  at: PointOrRef.optional(),
  vector: z
    .object({
      magnitude: z.number().optional(),
      angle: z.number().optional(),
      direction: z.enum(["up", "down", "left", "right"]).optional(),
      dx: z.number().optional(),
      dy: z.number().optional(),
    })
    .optional(),
  scale: z.number().positive().optional(),
});

export const VelocitySchema = ForceSchema.omit({ type: true }).extend({ type: z.literal("velocity") });
export const AccelerationSchema = ForceSchema.omit({ type: true }).extend({ type: z.literal("acceleration") });

export const AxisSchema = z.object({
  ...Base,
  type: z.literal("axis"),
  at: PointOrRef,
  params: z.object({
    angle: z.number().default(0),
    length: z.number().positive().default(1),
    name: z.string().optional(),
  }),
});

export const AngleArcSchema = z.object({
  ...Base,
  type: z.literal("angle_arc"),
  at: PointOrRef,
  params: z.object({
    from: z.number(),
    to: z.number(),
    radius: z.number().positive().default(0.4),
  }),
});

export const LabelSchema = z.object({
  ...Base,
  type: z.literal("label"),
  at: PointOrRef,
  params: z.object({
    text: z.string(),
    offset: PointLit.optional(),
  }),
});

export const DimensionSchema = z.object({
  ...Base,
  type: z.literal("dimension"),
  from: PointOrRef,
  to: PointOrRef,
  params: z.object({ text: z.string().optional(), offset: z.number().default(0.3) }).optional(),
});

// New: local frame attached to a solid
export const LocalFrameSchema = z.object({
  ...Base,
  type: z.literal("local_frame"),
  of: z.string(),
  origin: z.string().default("cog"),
  mode: z.enum(["surface_aligned", "world_aligned"]).default("surface_aligned"),
  axes: z.tuple([z.string(), z.string()]).default(["x'", "y'"] as const),
  length: z.number().positive().default(0.6),
});

// New: project a force onto a frame's axes
export const ProjectionSchema = z.object({
  ...Base,
  type: z.literal("projection"),
  force: z.string(),
  onto: z.string(), // "blockId.frame" or frameId
  components: z.array(z.enum(["x", "y"])).default(["x", "y"]),
  labels: z.array(z.string()).optional(),
});

export const ComponentSchema = z.discriminatedUnion("type", [
  GroundSchema, WallSchema, InclineSchema, BlockSchema, SphereSchema, PulleySchema,
  RopeSchema, SpringSchema, RodSchema,
  ForceSchema, VelocitySchema, AccelerationSchema,
  AxisSchema, AngleArcSchema, LabelSchema, DimensionSchema,
  LocalFrameSchema, ProjectionSchema,
]);
export type Component = z.infer<typeof ComponentSchema>;

// New: top-level constraints
export const ConstraintSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("horizontal"), object: z.string(), priority: z.number().default(10), weight: z.number().default(1) }),
  z.object({ type: z.literal("vertical"), object: z.string(), priority: z.number().default(10), weight: z.number().default(1) }),
  z.object({ type: z.literal("colinear"), points: z.array(z.string()), priority: z.number().default(8), weight: z.number().default(1) }),
  z.object({
    type: z.literal("tangent"),
    rope: z.string(),
    pulley: z.string(),
    side: z.enum(["external", "internal", "upper", "lower", "auto"]).default("auto"),
    priority: z.number().default(9),
    weight: z.number().default(1),
  }),
  z.object({
    type: z.literal("attach_face_center"),
    rope: z.string(),
    object: z.string(),
    face: z.enum(["top", "bottom", "left", "right"]),
    end: z.enum(["from", "to"]).default("from"),
    priority: z.number().default(7),
    weight: z.number().default(1),
  }),
  z.object({ type: z.literal("tension"), rope: z.string(), priority: z.number().default(5), weight: z.number().default(1) }),
  z.object({ type: z.literal("tension_equal"), rope: z.string(), priority: z.number().default(5), weight: z.number().default(1) }),
]);
export type Constraint = z.infer<typeof ConstraintSchema>;

export const SchemaSchema = z.object({
  frame: FrameSchema,
  components: z.array(ComponentSchema),
  constraints: z.array(ConstraintSchema).optional(),
});
export type Schema = z.infer<typeof SchemaSchema>;

export type Point = { x: number; y: number };

// ─── Internal normalized AnchorRef ──────────────────────────────────────────
export type NormRef =
  | { kind: "point"; id: string; anchor: string; offset?: Point }
  | { kind: "curve"; id: string; curve: string; t: number; offset?: Point }
  | { kind: "tangent"; from: string; to: string; side: "external" | "internal" | "auto" | "upper" | "lower"; offset?: Point }
  | { kind: "face"; id: string; face: "top" | "bottom" | "left" | "right"; align: "center" | "start" | "end"; offset?: Point }
  | { kind: "normal"; id: string; length: number; offset?: Point }
  | { kind: "best_face"; id: string; towards: string; offset?: Point };

/** Convert any ref form (legacy string-ref or v2 union) to NormRef. Returns null for plain points. */
export function normalizeRef(v: any): NormRef | null {
  if (!v || typeof v !== "object") return null;
  if ("kind" in v) return v as NormRef;
  if ("ref" in v) {
    const ref: string = v.ref;
    // tangent_to:X → tangent
    const tm = ref.match(/^([\w-]+)\.tangent_to:([\w-]+)$/);
    if (tm) return { kind: "tangent", from: tm[2], to: tm[1], side: "auto", offset: v.offset };
    const dot = ref.indexOf(".");
    if (dot < 0) return { kind: "point", id: ref, anchor: "origin", offset: v.offset };
    const id = ref.slice(0, dot);
    const name = ref.slice(dot + 1);
    if (typeof v.t === "number") return { kind: "curve", id, curve: name, t: v.t, offset: v.offset };
    return { kind: "point", id, anchor: name, offset: v.offset };
  }
  return null;
}

export function isRef(v: any): boolean {
  return v && typeof v === "object" && (("kind" in v) || ("ref" in v));
}
