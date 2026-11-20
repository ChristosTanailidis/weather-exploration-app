import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

/** Only the ECharts parts the two charts use (tree-shaken build). */
use([LineChart, BarChart, GridComponent, TooltipComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer])
