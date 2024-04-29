import React from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'
import '@/styles/loadindicator.css'

const LoadIndicator = () => (
  <div className='container'>
    <h2>Loading</h2>
    <div className='icon'>
      <Spin
        indicator={<LoadingOutlined spin />}
      />
    </div>
  </div>
)

export default LoadIndicator