import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CommodityDocument = HydratedDocument<Commodity>;

@Schema({
  collection: "commodities",
  versionKey: false
})
export class Commodity {
  @Prop({ required: true })
  createdAt!: Date;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({ type: String, default: null })
  deletedBy!: string | null;

  @Prop({ default: "" })
  description!: string;

  @Prop({ default: "" })
  imageFileId!: string;

  @Prop({ default: "" })
  imageUrl!: string;

  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ enum: ["on_sale", "pending", "offline"], required: true })
  status!: "on_sale" | "pending" | "offline";

  @Prop({ required: true, min: 0 })
  stock!: number;

  @Prop({ default: "tenant_demo", required: true })
  tenantId!: string;

  @Prop({ required: true })
  updatedAt!: Date;
}

export const CommoditySchema = SchemaFactory.createForClass(Commodity);

CommoditySchema.index(
  { tenantId: 1, deletedAt: 1, status: 1 },
  { name: "idx_commodities_tenant_active_status" }
);
CommoditySchema.index(
  { tenantId: 1, deletedAt: 1, createdAt: -1, id: -1 },
  { name: "idx_commodities_tenant_active_created_at_id" }
);
CommoditySchema.index(
  { tenantId: 1, deletedAt: 1, status: 1, createdAt: -1, id: -1 },
  { name: "idx_commodities_tenant_active_status_created_at_id" }
);
CommoditySchema.index(
  { tenantId: 1, name: 1 },
  { name: "idx_commodities_tenant_name_unique", unique: true }
);
