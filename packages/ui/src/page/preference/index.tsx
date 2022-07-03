import { rootActions, rootState } from '$ui/store'
import useImmerState from '$ui/util/hooks/useImmerState'
import { CloudDownloadOutlined, CloudUploadOutlined, SettingFilled } from '@ant-design/icons'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import { Button, Card, Col, Input, message, Modal, Row, Space } from 'antd'
import { ipcRenderer, shell } from 'electron'
import fse from 'fs-extra'
import launch from 'launch-editor'
import _ from 'lodash'
import moment from 'moment'
import { tmpdir } from 'os'
import path from 'path'
import React, { useCallback, useState } from 'react'
import { useSnapshot } from 'valtio'

import PRESET_JSON_DATA from '../../assets/基本数据规则.json'
import storage from '../../storage/index'
import customMerge from '../../util/sync/webdav/customMerge'
import helper from '../../util/sync/webdav/helper'
import styles from './index.module.less'
import { pick as pickSelectExport, SelectExportForStaticMethod } from './modal/SelectExport'

export default function Preference() {
  const [showModal, setShowModal] = useState(false)

  const onUpload = useMemoizedFn(async () => {
    await helper.upload()
  })
  const onForceUpload = useMemoizedFn(async () => {
    await helper.forceUpload()
  })

  const onDownload = useMemoizedFn(async () => {
    await helper.download()
  })
  const onForceDownload = useMemoizedFn(async () => {
    await helper.forceDownload()
  })

  const [exportHelperVisible, setExportHelperVisible] = useState(false)
  const [exportFile, setExportFile] = useState('')

  const onExport = useMemoizedFn(async () => {
    const file = path.join(tmpdir(), 'cfm', `${moment().format('YYYY_MM_DD__HH_mm')}.json`)

    const outputData = storage.store
    const data = _.omit(outputData, ['subscribe_detail'])
    await fse.outputJson(file, data, { spaces: 2 })
    setExportHelperVisible(true)
    setExportFile(file)
  })

  const onSelectImport = useMemoizedFn(async () => {
    const file = path.join(
      tmpdir(),
      'cfm',
      `${moment().format('选择导出__YYYY_MM_DD__HH_mm')}.json`
    )
    const fullData = storage.store
    const outputData = _.omit(fullData, ['subscribe_detail'])

    // 选择数据
    const { cancel, data } = await pickSelectExport(outputData)
    if (cancel) return
    console.log(data)

    await fse.outputJson(file, data, { spaces: 2 })
    setExportHelperVisible(true)
    setExportFile(file)
  })

  const importAction = (importData) => {
    const localData = { ...storage.store }
    const merged = customMerge(localData, importData)
    console.log('customMerge', { localData, importData, merged })

    // reload electron-store
    storage.store = merged

    // reload redux
    rootActions.global.reload()

    message.success('导入成功: 已与本地配置合并')
  }

  const onImport = useMemoizedFn(async () => {
    const file = await ipcRenderer.invoke('select-file')
    if (!file) return

    let importData
    try {
      importData = await fse.readJson(file)
    } catch (e) {
      console.log(e.stack || e)
      return message.error('readJson fail: ' + '\n' + e.stack || e)
    }
    importAction(importData)
  })

  const onImportPreset = useMemoizedFn(async () => {
    importAction(PRESET_JSON_DATA)
  })

  const openInEditor = useMemoizedFn((editor) => {
    launch(
      // file
      exportFile,
      // try specific editor bin first (optional)
      editor,
      (fileName, errorMsg) => {
        message.error(errorMsg)
      }
    )
  })

  const rowGutter = { xs: 8, sm: 16, md: 24 }

  return (
    <div className={styles.page}>
      <ModalSyncConfig {...{ visible: showModal, setVisible: setShowModal }} />

      <Modal
        title='已导出'
        visible={exportHelperVisible}
        onOk={() => setExportHelperVisible(false)}
        onCancel={() => setExportHelperVisible(false)}
        centered
        maskClosable={false}
        keyboard={true}
      >
        <div style={{ marginBottom: 12 }}>文件位置: {exportFile}</div>
        <Space>
          <Button
            onClick={() => {
              shell.showItemInFolder(exportFile)
            }}
          >
            在 Finder 中展示
          </Button>
          <Button
            onClick={() => {
              openInEditor('code')
            }}
          >
            在 vscode 中打开
          </Button>
          <Button
            onClick={() => {
              openInEditor('atom')
            }}
          >
            在 Atom 中打开
          </Button>
        </Space>
      </Modal>

      <div style={{ textAlign: 'right' }}>
        <Button
          type='primary'
          onClick={() => {
            setShowModal(true)
          }}
        >
          <SettingFilled />
          配置同步参数
        </Button>
      </div>

      <Row gutter={rowGutter} style={{ marginTop: 10 }}>
        {/* 上传区 */}
        <Col span={12}>
          <Card
            title={
              <>
                <CloudUploadOutlined /> 上传
              </>
            }
          >
            <Space direction='vertical' size={20} style={{ width: '100%' }}>
              <Button type='primary' size='large' block onClick={onUpload}>
                <CloudUploadOutlined />
                上传
              </Button>

              <Button type='primary' danger block onClick={onForceUpload}>
                <CloudUploadOutlined />
                上传 (覆盖远程版本)
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 下载区 */}
        <Col span={12}>
          <Card
            title={
              <>
                <CloudDownloadOutlined /> 下载
              </>
            }
          >
            <Space direction='vertical' size={20} style={{ width: '100%' }}>
              <Button type='primary' size='large' block onClick={onDownload}>
                <CloudDownloadOutlined />
                下载
              </Button>
              <Button type='primary' danger block onClick={onForceDownload}>
                <CloudDownloadOutlined />
                下载(覆盖本地版本)
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={rowGutter} style={{ marginTop: 10 }}>
        {/* 导出区 */}
        <Col span={12}>
          <Card
            title={
              <>
                <CloudUploadOutlined /> 导出
              </>
            }
          >
            <SelectExportForStaticMethod />
            <Space direction='vertical' size={20} style={{ width: '100%' }}>
              <Button block type='primary' onClick={onExport}>
                <CloudUploadOutlined /> 导出到 JSON
              </Button>
              <Button block onClick={onSelectImport}>
                <CloudUploadOutlined /> 高级导出
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 导入区 */}
        <Col span={12}>
          <Card
            title={
              <>
                <CloudUploadOutlined /> 导入
              </>
            }
          >
            <Space direction='vertical' size={20} style={{ width: '100%' }}>
              <Button type='primary' block onClick={onImport}>
                <CloudUploadOutlined /> 从 JSON 导入
              </Button>

              <Button block onClick={onImportPreset}>
                <CloudUploadOutlined /> 导入应用内置的基本设置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

interface ModalSyncConfigProps {
  visible
  setVisible
  editItem?
  editItemIndex?
}

function ModalSyncConfig(props: ModalSyncConfigProps) {
  const { visible, setVisible } = props

  const syncConfig = useSnapshot(rootState.preference.syncConfig)
  const [data, modifyData] = useImmerState(syncConfig)

  useUpdateEffect(() => {
    if (visible) {
      modifyData(syncConfig)
    }
  }, [visible, syncConfig])

  const handleCancel = useCallback(() => {
    setVisible(false)
  }, [])

  const handleOk = useMemoizedFn((e) => {
    e?.preventDefault()
    e?.stopPropagation()

    console.log(data)
    const { davServerUrl, user, pass } = data

    if (!davServerUrl || !user || !pass) {
      return message.warn('davServerUrl & user & pass 不能为空')
    }

    // save
    rootState.preference.syncConfig = data

    // close
    setVisible(false)
  })

  return (
    <Modal
      width={'80vw'}
      className={styles.modal}
      title='服务器设置'
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Input
        className='input-row'
        prefix={<label className='label'>server url</label>}
        value={data.davServerUrl}
        onChange={(e) => modifyData({ davServerUrl: e.target.value })}
        onPressEnter={handleOk}
      />
      <Input
        className='input-row'
        prefix={<label className='label'>user</label>}
        value={data.user}
        onChange={(e) => modifyData({ user: e.target.value })}
        onPressEnter={handleOk}
      />
      <Input
        className='input-row'
        type='password'
        prefix={<label className='label'>password</label>}
        value={data.pass}
        onChange={(e) => modifyData({ pass: e.target.value })}
        onPressEnter={handleOk}
      />
    </Modal>
  )
}
