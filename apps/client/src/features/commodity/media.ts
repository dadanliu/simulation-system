export function getCommodityImageSizes(kind: "detail" | "thumb") {
  return kind === "thumb" ? "56px" : "(max-width: 768px) 100vw, 420px";
}
