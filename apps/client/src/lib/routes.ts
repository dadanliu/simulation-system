export type NavRoute = {
  href: string;
  label: string;
  matchPrefixes: string[];
  title: string;
  description: string;
};

export const routes: NavRoute[] = [
  {
    href: "/present/commodity/list",
    label: "商品列表",
    matchPrefixes: ["/present/commodity/list"],
    title: "商品列表",
    description: "查看商品列表、概览数据和后续的筛选分页入口。"
  },
  {
    href: "/present/commodity/create",
    label: "创建商品",
    matchPrefixes: ["/present/commodity/create"],
    title: "创建商品",
    description: "填写商品基础信息，后续在这里接入提交校验和创建接口。"
  },
  {
    href: "/present/commodity/10001",
    label: "商品详情",
    matchPrefixes: ["/present/commodity/"],
    title: "商品详情",
    description: "展示单个商品详情，动态路由会根据商品 ID 渲染对应页面。"
  },
  {
    href: "/login",
    label: "登录页",
    matchPrefixes: ["/login"],
    title: "后台登录",
    description: "后台登录入口，后续会接入 BFF 鉴权和 cookie 会话。"
  }
];

export function getActiveRoute(pathname: string) {
  return routes.find((route) =>
    route.matchPrefixes.some((prefix) =>
      prefix === "/present/commodity/"
        ? pathname.startsWith(prefix) &&
          pathname !== "/present/commodity/create" &&
          pathname !== "/present/commodity/list"
        : pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}
