import React, { useCallback } from 'react'
import { Button, message } from 'antd'
import store from '@ui/store'
import { runCommand } from '@ui/commands/run'
import styles from './index.module.less'
import { useMobxAddRuleModal } from './useAddRuleModal'

export default function Home() {
  const generate = useCallback(() => {
    runCommand('generate')
  }, [])

  const { open: addRule, modal } = useMobxAddRuleModal({
    mode: 'from-global',
    handleAdd(rule: string, ruleId: string) {
      if (!rule || !ruleId) {
        return message.warn(`内容 or 待添加规则为空`)
      }

      const index = store.getState().libraryRuleList.list.findIndex((item) => item.id === ruleId)
      const ruleItem = store.getState().libraryRuleList.list[index]
      if (!ruleItem) {
        return message.warn(`找不到待添加规则`)
      }

      const content = ruleItem.content || ''
      if (content.split('\n').find((x: string) => x.includes(rule) && !x.trim().startsWith('#'))) {
        return message.error(`rule ${rule} 已存在`)
      }

      // construct new content
      const newContent = content.trimEnd() + '\n' + `  - ${rule}` + '\n'
      // save new content
      store.dispatch.libraryRuleList.edit({
        editItemIndex: index,
        item: { ...ruleItem, content: newContent },
      })
      message.success(`已添加规则 ${rule} 至 ${ruleItem.name}`)

      // 生成
      runCommand('generate')
    },
  })

  return (
    <div className={styles.page}>
      {modal}
      <h1 className={styles.title}>Enjoy</h1>
      <div className={styles.btnGenWrapper} style={{ padding: 20 }}>
        <Button type='primary' shape='round' className={styles.btnGen} onClick={generate} block>
          重新生成配置文件
        </Button>
        <Button type='default' shape='round' className={styles.btnAddRule} onClick={addRule} block>
          快捷添加规则
        </Button>
      </div>
    </div>
  )
}
