declare module "*.css" {
  const content: string
  export default content
}

declare module "*.scss" {
  const content: string
  export default content
}

declare module "*.svg" {
  const content: React.FC<React.SVGProps<SVGSVGElement>>
  export default content
}
