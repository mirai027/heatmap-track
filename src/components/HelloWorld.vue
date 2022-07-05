<script setup lang="ts">
import h337 from 'heatmap.js'
import { getScrollbarWidth } from '@/utils'

const scrollWidth = ref(getScrollbarWidth())
const showModal = ref(false)

const hideModal = () => {
  setTimeout(() => {
    showModal.value = false
  }, 200)
}

const createElement = (x: number, y: number, position: 'absolute' | 'fixed') => {
  const div = document.createElement('div')
  div.style.width = '10px'
  div.style.height = '10px'
  div.style.backgroundColor = '#f00'
  div.style.position = position
  div.style.left = x - 5 + 'px'
  div.style.top = y - 5 + 'px'
  document.body.appendChild(div)
}

const postTrackEvent = (point: TrackPointType) => {
  const pointList: TrackPointType[] = JSON.parse(sessionStorage.getItem('POINT_LIST') ?? '[]')
  pointList.push(point)
  sessionStorage.setItem('POINT_LIST', JSON.stringify(pointList))
}

const realFixedElement = (element: HTMLElement): HTMLElement => {
  const childNode = element.children[0] as HTMLElement
  const elementPosition = window.getComputedStyle(element).getPropertyValue('position')
  let childPosition: undefined | string
  if (childNode) {
    childPosition = window.getComputedStyle(childNode).getPropertyValue('position')
  }
  if (elementPosition === 'fixed' && childPosition === 'relative') {
    return childNode
  }
  return element
}

const computedFixedPointX = (point: TrackPointType, innerWidth: number) => {
  const { x, sw, w, ol, } = point
  const centerXCoord = sw / 2
  const isLeft = ol! < centerXCoord
  const isCenter = (ol! + 10) > centerXCoord && (ol! - 10) < centerXCoord || ol === 0
  const isRight = ol! > centerXCoord

  if (isCenter) {
    // 相对于[目标元素]，用户点击的位置
    const targetPonitX = x - (sw - w) / 2
    // [当前 html]中[目标元素] offsetLeft位置
    const currentOffsetLeft = (innerWidth - w) / 2
    return ~~(currentOffsetLeft + targetPonitX)
  } else if (isRight) {
    // [目标元素]在[目标 html]中的 offsetRight值
    const offsetRight = sw - ol! - w
    // [目标元素]在[当前 html]中 offsetLeft的值
    const currentOffsetLeft = innerWidth - w - offsetRight
    // 相对于[目标元素]，用户点击的位置
    const targetPointX = x - ol!
    return ~~(currentOffsetLeft + targetPointX)
  } else {
    return ~~(x)
  }
}

const computedFixedPointY = (point: TrackPointType, innerHeight: number) => {
  const { y, sh, h, ot } = point
  const centerYCoord = sh / 2

  const isTop = ot! < centerYCoord || ot === 0
  const isCenter = (ot! + 10) > centerYCoord && (ot! - 10) < centerYCoord
  const isBottom = ot! > centerYCoord

  if (isTop) {
    if (ot === 0) {
      return ~~(y)
    }
    // TODO: 存在设置了top: 百分比的元素（客服侧栏），临时根据手动计算百分比值特殊处理
    const offsetTopPercent = ot! / sh
    return ~~(y - ot! + innerHeight * offsetTopPercent)
  } else if (isCenter) {
    // 相对于[目标元素]，用户点击的位置
    const targetPointY = y - (sh - h) / 2
    // [目标元素]在[当前 html]中 offsetTop的值
    const currentOffsetTop = (innerHeight - h) / 2
    return ~~(targetPointY + currentOffsetTop)
  } else {
    // [目标元素]在[目标 html]中 offsetBottom的值
    const offsetBottom = sh - ot! - h

    // 相对于[目标元素]，用户点击的位置
    const targetPointY = y - ot!
    // [目标元素]在[当前 html]中 offsetTop的值
    const currentOffsetTop = innerHeight - h - offsetBottom
    return ~~(targetPointY + currentOffsetTop)
  }
}

const getPointMaxCountValue = (heatmapList: { x: number; y: number; value: number; }[]) => {
  const max = Object.values(heatmapList.reduce((pre: Record<string, number>, cur) => {
    const pointKey = `${cur.x}_${cur.y}`
    pre[pointKey] ? pre[pointKey]++ : (pre[pointKey] = 1)
    return pre
  }, {})).sort().at(-1) ?? 1
  return max + 1
}

const renderFixedPoint = () => {
  const pointList: TrackPointType[] = JSON.parse(sessionStorage.getItem('POINT_LIST') ?? '[]')
  const fixedPointList = pointList.filter(x => x.f)

  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight

  fixedPointList.forEach(point => {
    console.log('==', computedFixedPointX(point, innerWidth))
    createElement(
      computedFixedPointX(point, innerWidth),
      computedFixedPointY(point, innerHeight),
      'fixed'
    )
  })

  const heatmapList = fixedPointList.map(point => ({
    x: computedFixedPointX(point, innerWidth),
    y: computedFixedPointY(point, innerHeight),
    value: 1
  }))

  const heatmap = h337.create({
    container: document.querySelector('#fixed-heatmap')!,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    radius: 18,
    maxOpacity: 1,
    minOpacity: 0.1,
    blur: 0.8,
    // gradient: {
    //   0: '#206C7C',
    //   '.2': '#2EA9A1',
    //   '.4': '#91EABC',
    //   '.6': '#FFF598',
    //   '.8': '#FFB74A',
    //   1: '#ff0000',
    // },
  })
  heatmap.setData({
    min: 0,
    max: getPointMaxCountValue(heatmapList),
    data: heatmapList,
  })
}

onMounted(() => {
  document.addEventListener('click', (event) => {
    const { x, y, pageX, pageY } = event

    const sw = window.innerWidth
    const sh = window.innerHeight

    const target = event.target as HTMLElement

    if (target.className.includes('fixed-wrapper')) {
      return
    }

    const { width: w, height: h } = target.getBoundingClientRect()
    const cn = target.className

    let f: boolean | undefined = undefined
    let ol: number | undefined = undefined
    let ot: number | undefined = undefined
    let fcn: string | undefined = undefined

    console.log('[ qwk-log ] ~ event.composedPath()', event.composedPath())
    for (let index = 0; index < event.composedPath().length; index++) {
      const element = event.composedPath()[index] as HTMLElement
      console.log('[ qwk-log ] ~ element', element)

      if (element.id === 'app' || element.className === 'wap-body') {
        break
      }

      // 判断层级中是否存在 fixed定位属性
      if (
        window.getComputedStyle(element).getPropertyValue('position') === 'fixed'
      ) {
        console.log('===', element)
        f = true
        // 可能存在父元素是 fixed元素，子元素是 relative居中定位。这种情况下实际需要的是子元素的 offset、className等值，因此需要进一步判断
        const realElement = realFixedElement(element)
        ol = realElement.offsetLeft
        ot = realElement.offsetTop
        fcn = realElement.className
      }
    }

    createElement(pageX, pageY, 'absolute')

    postTrackEvent({
      u: window.location.href,
      x,
      y,
      px: pageX,
      py: pageY,
      sw,
      sh,
      w,
      h,
      f,
      ol,
      ot,
      cn,
      fcn,
      sbw: scrollWidth.value,
      sbh: scrollWidth.value,
    })
  }, false)
})
</script>

<template>
  <div class="home-wrapper">
    <header class="header">
      <div class="container-wrapper header-wrapper">
        <nav>
          <img src="@/assets/logo.png" alt="" />
          <div class="nav-item">首页</div>
          <div class="nav-item">魔鬼特训班</div>
          <div class="nav-item">魔鬼特训班</div>
          <div class="nav-item">魔鬼特训班</div>
        </nav>
        <div class="avatar"></div>
      </div>
    </header>
    <main>
      <div class="container-wrapper feature feature-1" v-for="item in 39" :key="item">
        <div class="card main">
          <h3>{{ item }}</h3>
        </div>
        <div class="card item" />
        <div class="card item" />
        <div class="card item" />
        <div class="card item item-pro">
          <div class="block" v-for="childItem in 49" :key="childItem">
            {{ childItem }}
          </div>
        </div>
      </div>
    </main>
    <footer>footer</footer>
    <div class="sticky-block-box">
      <div class="sticky-item" v-for="item in 5" :key="item">
        <div class="icon" />
        <div class="label">{{ item }}{{ item }}{{ item }}{{ item }}</div>
      </div>
    </div>
    <div class="el-modal-wrapper" v-if="showModal">
      <div class="el-modal">Lorem, ipsum dolor sit amet consectetur adipisicing elit. Esse aliquid consequuntur, quis
        nam illo in maxime quos magni aliquam non consectetur ad facilis magnam ut ullam saepe laborum fugiat doloribus!
        <div class="close close-track-element" @click="hideModal"></div>
      </div>
    </div>
  </div>

  <div class="center" />
  <div class="fixed-wrapper show-modal" @click="showModal = true">模态框</div>
  <div class="fixed-wrapper render-track" @click="renderFixedPoint">埋点</div>

  <div id="fixed-heatmap"></div>
</template>

<style scoped lang="scss">
@function random-color() {
  @return rgba(random(255), random(255), random(255), 0.7);
}

@function random-number($min, $max) {
  $rand: random();
  $randomNum: $min +floor($rand * (($max - $min) + 1));

  @return $randomNum;
}

.home-wrapper {
  padding: 60px 0 70px;
  color: #333;
  position: relative;

  .container-wrapper {
    width: 1200px;
    margin: 0 auto;
  }

  .card {
    background-color: #f4f5f7;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background-color: random-color();
    }
  }

  .item-pro {
    display: grid;
    grid-template-rows: repeat(7, 1fr);
    grid-template-columns: repeat(7, 1fr);
    row-gap: 4px;
    column-gap: 4px;

    &:hover {
      background-color: transparent;
    }

    @for $i from 1 through 49 {
      .block:nth-of-type(#{$i}) {
        background-color: random-color();

        &:hover {
          filter: invert(100%);
        }
      }
    }

    .block {
      width: 100%;
      height: 100%;
      font-size: 10px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  header {
    width: 100%;
    height: 60px;
    background-color: random-color();
    position: fixed;
    top: 0;
    left: 0;

    .header-wrapper {
      display: flex;
      align-items: center;
      height: 60px;
      background-color: random-color();
      margin: 0 auto;

      nav {
        height: 60px;
        display: flex;
        align-items: center;

        img {
          height: 40px;
          margin-right: 20px;
        }

        .nav-item {
          padding: 0 12px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      }

      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #fff;
        margin-left: auto;
        cursor: pointer;
      }
    }
  }

  main {
    .feature {
      height: 300px;
      margin-top: 12px;
    }

    .feature-1 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      row-gap: 10px;
      column-gap: 10px;

      &:nth-of-type(3n - 1) {
        direction: rtl;
      }

      .main {
        grid-column: 1 / 3;
        grid-row: 1 / 3;
      }
    }
  }

  footer {
    width: 100%;
    height: 60px;
    background-color: random-color();
    position: fixed;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sticky-block-box {
    width: 80px;
    position: fixed;
    right: 30px;
    top: 35%;
    border-radius: 8px;
    overflow: hidden;

    .sticky-item {
      width: 80px;
      height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;

      &:hover {
        filter: invert(100%);
      }

      @for $i from 1 through 5 {
        &:nth-of-type(#{$i}) {
          background-color: random-color();
        }
      }

      .icon {
        width: 50px;
        height: 50px;
        border-radius: 4px;
        background-color: #fff;
      }

      .label {
        font-size: 16px;
        color: #fff;
        margin-top: 4px;
      }
    }
  }

  .el-modal-wrapper {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background-color: rgba(0, 0, 0, .5);

    .el-modal {
      position: relative;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      height: 150px;
      background-color: #fff;
      border-radius: 8px;
      padding: 24px;

      .close {
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        top: -30px;
        right: -30px;
        background-color: #fff;
        cursor: pointer;
      }
    }
  }

}

.center {
  position: fixed;
  width: 10px;
  height: 10px;
  background-color: rgb(0, 0, 0);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.fixed-wrapper {
  position: fixed;
  right: 40px;
  width: 70px;
  height: 70px;
  line-height: 70px;
  text-align: center;
  background-color: #39c5bb;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.show-modal {
  top: 100px;
}

.render-track {
  top: 180px;
}

#fixed-heatmap {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2000;
  pointer-events: none;
}
</style>
