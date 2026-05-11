import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { DEFAULT_TENANT_ID } from "../user.types";

export type UserDocument = HydratedDocument<UserEntity>;

@Schema({
  collection: "users",
  versionKey: false
})
export class UserEntity {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  displayName!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ type: [String], default: [] })
  roles!: string[];

  @Prop({ default: DEFAULT_TENANT_ID })
  tenantId!: string;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
