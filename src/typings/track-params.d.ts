type TrackPointType = {
  /** url 地址 */
  u: string,
  /** 鼠标指针在 Window 中的 X 坐标 */
  x: number
  /** 鼠标指针在 Window 中的 Y 坐标 */
  y: number
  /** 鼠标指针相对于整个文档的 X 坐标 */
  px: number
  /** 鼠标指针相对于整个文档的 Y 坐标 */
  py: number
  /** html 元素的宽度 */
  sw: number
  /** html 元素的高度 */
  sh: number
  /** 目标元素的宽度 */
  w: number
  /** 目标元素的高度 */
  h: number
  /** 点击的目标元素是否为 Fixed 定位元素 */
  f?: boolean,
  /** 目标元素的 offsetLeft 值 */
  ol?: number
  /** 目标元素的 offsetTop 值 */
  ot?: number
  /** 目标元素的 className */
  cn?: string
  /** 目标元素的 fixed元素的 className 值 */
  fcn?: string
  /** html scrollBar width值 */
  sbw?: number
  /** html scrollBar height值 */
  sbh?: number
}
