export type Commodity = {
  id: string;
  name: string;
  price: number;
  status: "draft" | "online" | "offline";
};
