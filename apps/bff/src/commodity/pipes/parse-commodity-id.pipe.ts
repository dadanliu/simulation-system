import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseCommodityIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException("commodity id is invalid");
    }

    return value;
  }
}
