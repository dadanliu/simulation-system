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

  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ enum: ["on_sale", "pending", "offline"], required: true })
  status!: "on_sale" | "pending" | "offline";

  @Prop({ required: true, min: 0 })
  stock!: number;

  @Prop({ required: true })
  updatedAt!: Date;
}

export const CommoditySchema = SchemaFactory.createForClass(Commodity);

CommoditySchema.index({ status: 1 });
CommoditySchema.index({ createdAt: -1 });
CommoditySchema.index({ status: 1, createdAt: -1 });
