import { View, Text } from '@tarojs/components'
import './index.scss'

interface EmptyProps {
  text?: string
}

/** 空态占位（快照缺失 / 无搜索结果等场景，保证不崩） */
export default function Empty({ text = '暂无数据' }: EmptyProps) {
  return (
    <View className='empty'>
      <View className='empty__disc'>
        <Text className='empty__note'>♪</Text>
      </View>
      <Text className='empty__text'>{text}</Text>
    </View>
  )
}
