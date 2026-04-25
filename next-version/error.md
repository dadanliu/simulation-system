BadRequestException	400	请求参数错误、校验失败。
UnauthorizedException	401	未认证或认证失败，比如 token 无效。
ForbiddenException	403	已认证但没有权限访问。
NotFoundException	404	资源不存在。
MethodNotAllowedException	405	请求方法不被允许。
NotAcceptableException	406	请求内容特性不可接受。
RequestTimeoutException	408	请求超时。
ConflictException	409	资源冲突，比如重复创建。
GoneException	410	资源已被永久删除。
PayloadTooLargeException	413	请求体过大，比如上传文件太大。
UnsupportedMediaTypeException	415	媒体类型不支持。
UnprocessableEntityException	422	语义正确但验证未通过，常用于复杂校验。
InternalServerErrorException	500	服务器内部错误。
NotImplementedException	501	功能未实现。
BadGatewayException	502	网关错误。
ServiceUnavailableException	503	服务不可用。
GatewayTimeoutException	504	网关超时。
常见写法
NestJS 可以直接抛出 HttpExcepusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

1. 业务系统异常怎么设计，需要再单独定义一层么？
2. 常用的code码怎么记？
