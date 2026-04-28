import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RoleDocument = HydratedDocument<RoleEntity>;

@Schema({
  collection: "roles",
  versionKey: false
})
export class RoleEntity {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  permissions!: string[];
}

export const RoleSchema = SchemaFactory.createForClass(RoleEntity);
