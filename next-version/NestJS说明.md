## observable 对象

含义是：

- next.handle() 返回的是一个 Observable
- .pipe(...) 用来串联 RxJS 操作符
- map((value) => ...) 会把 controller 返回的每个响应值转换成新的值
- 这里就是把原始返回值统一包装成：

next-bff/apps/bff/src/common/interceptors/success-response.interceptor.**ts**
