import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PermissionDocument = HydratedDocument<PermissionEntity>;

@Schema({
  collection: "permissions",
  versionKey: false
})
export class PermissionEntity {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;
}

export const PermissionSchema = SchemaFactory.createForClass(PermissionEntity);
