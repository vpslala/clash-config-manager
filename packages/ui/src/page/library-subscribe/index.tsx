import { Subscribe } from '$ui/common/define'
import {
  EyeFilled,
  EyeInvisibleFilled,
  EyeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  Button,
  Checkbox,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'antd'
import { ChangeEventHandler, KeyboardEventHandler, useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'
import styles from './index.module.less'
import { actions, state } from './model'

export default function LibrarySubscribe() {
  const { list } = useSnapshot(state)

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Subscribe | null>(null)
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null)

  const add = useMemoizedFn(() => {
    setEditItem(null)
    setEditItemIndex(null)
    setShowModal(true)
  })

  return (
    <div className={styles.page}>
      <ModalAdd
        visible={showModal}
        setVisible={setShowModal}
        editItem={editItem}
        editItemIndex={editItemIndex}
      />

      <List
        size='small'
        header={
          <div className='header' style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '2em' }}>订阅管理</div>
            <Button type='primary' onClick={add}>
              +
            </Button>
          </div>
        }
        bordered
        dataSource={list}
        renderItem={(item: Subscribe, index) => (
          <SubscribeItem
            key={item.id}
            {...{
              item,
              index,
              setEditItem,
              setEditItemIndex,
              setShowModal,
            }}
          />
        )}
      />
    </div>
  )
}

function SubscribeItem({
  item,
  index,
  setEditItem,
  setEditItemIndex,
  setShowModal,
}: {
  item: Subscribe
  index: number
  setEditItem: (item: Subscribe | null) => void
  setEditItemIndex: (index: number | null) => void
  setShowModal: (val: boolean) => void
}) {
  const { status, detail } = useSnapshot(state)

  const { url, name, excludeKeywords } = item
  let { urlVisible } = item
  if (typeof urlVisible !== 'boolean') urlVisible = true

  const edit = useMemoizedFn((item: Subscribe, index: number) => {
    setEditItem(item)
    setEditItemIndex(index)
    setShowModal(true)
  })

  // 手动点: 强制更新; 其他场景: 不强制更新
  const update = useMemoizedFn((item) => {
    actions.update({ url: item.url, forceUpdate: true })
  })

  const disableEnterAsClick: KeyboardEventHandler = useCallback((e) => {
    // disable enter
    if (e.keyCode === 13) {
      e.preventDefault()
    }
  }, [])

  const del = useMemoizedFn((index) => {
    Modal.confirm({
      title: '确认删除?',
      onOk() {
        actions.del(index)
      },
      onCancel() {
        console.log('Cancel')
      },
    })
  })

  let urlHided = ''
  if (url) {
    const u = new URL(url)
    u.searchParams.forEach((val, key) => {
      const keep = (n: number) =>
        val.slice(0, n) + '*'.repeat(val.slice(n, -n).length) + val.slice(-n)

      // keep 1/3 visible
      const n = Math.floor(val.length / 3 / 2)
      const valHided = keep(n)
      u.searchParams.set(key, valHided)
    })
    urlHided = u.toString()
  }

  const servers = detail[url]

  // <div className='list-item'>
  //   <div className='name'>{name}</div>
  //   <div className='url'>{url}</div>
  //   {excludeKeywords?.length && (
  //     <div className='exclude'>
  //       排除关键词:{' '}
  //       {excludeKeywords.map((s) => (
  //         <Tag key={s} color='warning'>
  //           {s}
  //         </Tag>
  //       ))}
  //     </div>
  //   )}
  // </div>
  // <Space style={{ alignSelf: 'flex-end' }}>
  //   <Button
  //     type='primary'
  //     onClick={(e) => edit(item, index)}
  //     onKeyDown={disableEnterAsClick}
  //   >
  //     编辑
  //   </Button>
  //   <Button type='primary' onClick={() => update(item)} onKeyDown={disableEnterAsClick}>
  //     更新
  //   </Button>
  //   <Button danger onClick={() => del(index)} onKeyDown={disableEnterAsClick}>
  //     删除
  //   </Button>
  // </Space>

  return (
    <List.Item style={{ display: 'flex', borderBottom: 'none' }}>
      <Descriptions
        bordered
        column={1}
        size='middle'
        style={{ width: '100%' }}
        labelStyle={{ width: '120px', textAlign: 'center' }}
      >
        <Descriptions.Item label='名称'>
          {name}
          {status[url] ? (
            <>
              <br />
              {status[url]}
            </>
          ) : null}
        </Descriptions.Item>

        {excludeKeywords?.length && (
          <Descriptions.Item label='排除关键词'>
            {excludeKeywords.map((s) => (
              <Tag key={s} color='warning'>
                {s}
              </Tag>
            ))}
          </Descriptions.Item>
        )}

        <Descriptions.Item
          label={
            <>
              链接{' '}
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  actions.toggleUrlVisible(index)
                }}
              >
                {urlVisible ? <EyeFilled /> : <EyeInvisibleFilled />}
              </span>
            </>
          }
          contentStyle={{ wordBreak: 'break-all' }}
        >
          {urlVisible ? url : urlHided}
        </Descriptions.Item>

        <Descriptions.Item label='操作'>
          <Space style={{ alignSelf: 'flex-end' }}>
            <Button
              type='primary'
              onClick={(e) => edit(item, index)}
              onKeyDown={disableEnterAsClick}
            >
              编辑
            </Button>
            <Button type='primary' onClick={() => update(item)} onKeyDown={disableEnterAsClick}>
              更新
            </Button>
            <Button danger onClick={() => del(index)} onKeyDown={disableEnterAsClick}>
              删除
            </Button>
            <Popover
              placement='top'
              title={'节点列表'}
              content={
                <div style={{ maxHeight: '50vh', overflowY: 'scroll' }}>
                  <ul>
                    {servers?.map((s) => (
                      <li key={s.name}>{s.name}</li>
                    ))}
                  </ul>
                </div>
              }
              trigger='click'
            >
              <Button icon={<UnorderedListOutlined />}>查看节点</Button>
            </Popover>
          </Space>
        </Descriptions.Item>
      </Descriptions>
    </List.Item>
  )
}

function ModalAdd({
  visible,
  setVisible,
  editItem,
  editItemIndex,
}: {
  visible: boolean
  setVisible: (visible: boolean) => void
  editItem?: Subscribe | null
  editItemIndex?: number | null
}) {
  const [url, setUrl] = useState(editItem?.url || '')
  const [name, setName] = useState(editItem?.name || '')
  const [id, setId] = useState(editItem?.id || crypto.randomUUID())
  const [excludeKeywords, setExcludeKeywords] = useState(editItem?.excludeKeywords || [])
  const [autoUpdate, setAutoUpdate] = useState(true)

  // min={1} // 1h
  // max={240} // 240h = 10d
  const [autoUpdateIntervalMin, autoUpdateIntervalMax] = [1, 240]
  const autoUpdateIntervalDefault = 12
  const [autoUpdateInterval, setAutoUpdateInterval] = useState(
    () => editItem?.autoUpdateInterval || autoUpdateIntervalDefault
  ) // 小时

  useUpdateEffect(() => {
    setUrl(editItem?.url || '')
    setName(editItem?.name || '')
    setId(editItem?.id || crypto.randomUUID())
    setExcludeKeywords(editItem?.excludeKeywords || [])
    setAutoUpdate(editItem?.autoUpdate ?? true)
    setAutoUpdateInterval(editItem?.autoUpdateInterval || autoUpdateIntervalDefault)
  }, [editItem, visible])

  type OnChange = ChangeEventHandler<HTMLInputElement>
  const onUrlChange: OnChange = useCallback((e) => {
    setUrl(e.target.value)
  }, [])
  const onNameChange: OnChange = useCallback((e) => {
    setName(e.target.value)
  }, [])

  const onExcludeKeywordsChange = useCallback((value: string[] = []) => {
    console.log('onExcludeKeywordsChange', value)
    setExcludeKeywords(value)
  }, [])

  const clean = () => {
    setUrl('')
    setName('')
    setId('')
  }

  const handleCancel = useCallback(() => {
    setVisible(false)
    clean()
  }, [])

  const handleOk = useMemoizedFn((e) => {
    e?.preventDefault()
    e?.stopPropagation()

    if (!url || !name) {
      return message.warn('url & name 不能为空')
    }

    const err = actions.check({ url, name, editItemIndex })
    if (err) {
      return message.error(err)
    }

    const mode = editItem ? 'edit' : 'add'

    const subscribeItem = { url, name, id, excludeKeywords, autoUpdate, autoUpdateInterval }
    if (mode === 'add') {
      actions.add(subscribeItem)
    } else {
      actions.edit({ ...subscribeItem, editItemIndex: editItemIndex! })
    }

    setVisible(false)
    clean()
  })

  return (
    <Modal
      className={styles.modal}
      bodyStyle={{ paddingTop: 10 }}
      title='添加'
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      centered
    >
      <Divider orientation='left' orientationMargin={0}>
        基础设置
      </Divider>
      <Input
        className='input-row'
        value={name}
        onChange={onNameChange}
        onPressEnter={handleOk}
        prefix={<label className='label'>名称:</label>}
      />

      <Input
        className='input-row'
        value={url}
        onChange={onUrlChange}
        onPressEnter={handleOk}
        prefix={<label className='label'>订阅链接:</label>}
      />

      <Checkbox
        checked={autoUpdate}
        onChange={(e) => setAutoUpdate(e.target.checked)}
        style={{ marginLeft: 0 }}
      >
        自动更新节点
      </Checkbox>

      {autoUpdate && (
        <div style={{ marginLeft: 0, marginTop: 5 }}>
          <InputNumber
            addonAfter={'小时'}
            min={autoUpdateIntervalMin}
            max={autoUpdateIntervalMax}
            defaultValue={autoUpdateIntervalDefault}
            value={autoUpdateInterval}
            onChange={(val) => val && setAutoUpdateInterval(val)}
          />
        </div>
      )}

      <Divider orientation='left' orientationMargin={0}>
        <Tooltip
          title={
            <p>
              订阅中的服务器名称如果包含以下任意一个关键词, 则该服务器不会包含在订阅中
              <br />
              <br />
              例如: 如果有高倍率(x3 / x4 / ...)节点, 不想使用, 设置关键词 <Tag>x3</Tag>{' '}
              <Tag>x4</Tag> 即可忽略这些节点
              <br />
              <br />
              例如: 如果机场提供了 HK 节点, 但你不想使用香港的节点, 设置关键词 <Tag>HK</Tag>{' '}
              即可忽略这些节点
            </p>
          }
        >
          根据关键词排除服务器:
        </Tooltip>
      </Divider>
      <Select
        mode='tags'
        style={{ width: '100%' }}
        placeholder='关键词'
        value={excludeKeywords}
        onChange={onExcludeKeywordsChange}
      ></Select>
    </Modal>
  )
}
