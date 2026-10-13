#!/usr/bin/env node
// マイルストーン計画の確認用スクリプト。運用ルールは docs/planning.md を参照。
// GitHub の Issue / マイルストーン / 依存関係 (blocked by) / Project を読むだけで、書き込みはしない。
import { execFileSync } from 'node:child_process'

const SLOTS_PER_DAY = 3
const SLOTS_BY_SIZE = { Tiny: 1, Small: 1, Medium: 2, Large: 3, 'X-Large': 6 }

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1 << 26 })

const QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, orderBy: { field: CREATED_AT, direction: ASC }) {
      nodes {
        number title state closedAt
        milestone { title dueOn }
        labels(first: 20) { nodes { name } }
        blockedBy(first: 50) { nodes { number } }
        blocking(first: 50) { nodes { number } }
        timelineItems(itemTypes: [ASSIGNED_EVENT], first: 1) {
          nodes { ... on AssignedEvent { createdAt } }
        }
        closedByPullRequestsReferences(first: 5) {
          nodes { number mergedAt commits(first: 1) { nodes { commit { authoredDate } } } }
        }
        projectItems(first: 5) {
          nodes {
            size: fieldValueByName(name: "Size") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            start: fieldValueByName(name: "Start") {
              ... on ProjectV2ItemFieldDateValue { date }
            }
            target: fieldValueByName(name: "Target") {
              ... on ProjectV2ItemFieldDateValue { date }
            }
          }
        }
      }
    }
  }
}`

function loadIssues() {
  const repo = JSON.parse(gh('repo', 'view', '--json', 'owner,name'))
  const res = JSON.parse(
    gh(
      'api',
      'graphql',
      '-f',
      `query=${QUERY}`,
      '-f',
      `owner=${repo.owner.login}`,
      '-f',
      `name=${repo.name}`,
    ),
  )
  const issues = new Map()
  for (const n of res.data.repository.issues.nodes) {
    const item = n.projectItems.nodes.find((p) => p.size || p.start || p.target) ?? {}
    const isEpic = n.labels.nodes.some((l) => l.name === 'epic')
    const sizeKey = Object.keys(SLOTS_BY_SIZE).find((k) => item.size?.name?.endsWith(k))
    const pr = n.closedByPullRequestsReferences.nodes.find((p) => p.mergedAt)
    // 着手時刻 = 自分を assign した時刻。無ければ PR の最初のコミット時刻で代用する
    const startedAt =
      n.timelineItems.nodes[0]?.createdAt ?? pr?.commits.nodes[0]?.commit.authoredDate
    issues.set(n.number, {
      number: n.number,
      title: n.title,
      open: n.state === 'OPEN',
      isEpic,
      milestone: n.milestone?.title ?? '(マイルストーンなし)',
      dueOn: n.milestone?.dueOn?.slice(0, 10),
      slots: isEpic ? 0 : SLOTS_BY_SIZE[sizeKey] ?? 1,
      sized: Boolean(sizeKey),
      start: item.start?.date,
      target: item.target?.date,
      blockedBy: n.blockedBy.nodes.map((b) => b.number),
      blocking: n.blocking.nodes.map((b) => b.number),
      startedAt,
      mergedAt: pr?.mergedAt,
      pr: pr?.number,
    })
  }
  return issues
}

const md = (date) => (date ? date.slice(5).replace('-', '/') : '--/--')
const line = (i) =>
  `#${String(i.number).padEnd(3)} ${i.isEpic ? 'epic' : `${i.slots}枠${i.sized ? ' ' : '?'}`} ${md(i.start)}→${md(i.target)}  ${i.title}`

function status(issues) {
  const open = [...issues.values()].filter((i) => i.open)
  const groups = Map.groupBy(open, (i) => i.milestone)
  const order = [...groups.keys()].sort((a, b) =>
    (groups.get(a)[0].dueOn ?? '9999').localeCompare(groups.get(b)[0].dueOn ?? '9999'),
  )
  for (const title of order) {
    const list = groups.get(title).sort((a, b) =>
      `${a.start ?? '9999'}${a.number}`.localeCompare(`${b.start ?? '9999'}${b.number}`),
    )
    const slots = list.reduce((s, i) => s + i.slots, 0)
    const due = list[0].dueOn ? `期日 ${md(list[0].dueOn)}` : '期日なし'
    console.log(
      `\n■ ${title} (${due}) 残り ${slots}枠 = 最短 ${Math.ceil(slots / SLOTS_PER_DAY)}日`,
    )
    for (const i of list) {
      const waits = i.blockedBy.filter((b) => issues.get(b)?.open)
      console.log(
        `  ${line(i)}${waits.length ? `  ← 待ち: ${waits.map((b) => `#${b}`).join(' ')}` : ''}`,
      )
    }
  }

  // 着手日 (Start) ごとの枠数。1日の上限を超えた日と、依存の順序が逆転している箇所を警告する
  const load = new Map()
  for (const i of open) if (i.start) load.set(i.start, (load.get(i.start) ?? 0) + i.slots)
  console.log('\n■ 日ごとの枠数 (Start 基準)')
  for (const [date, slots] of [...load].sort()) {
    console.log(
      `  ${md(date)} ${'█'.repeat(slots)} ${slots}${slots > SLOTS_PER_DAY ? ` ⚠ 上限${SLOTS_PER_DAY}枠を超過` : ''}`,
    )
  }
  const warnings = []
  for (const i of open) {
    for (const b of i.blockedBy.map((n) => issues.get(n)).filter((b) => b?.open)) {
      if (i.start && b.target && i.start < b.target)
        warnings.push(
          `#${i.number} の Start (${md(i.start)}) が先行 #${b.number} の Target (${md(b.target)}) より前`,
        )
    }
    if (i.dueOn && i.target && i.target > i.dueOn)
      warnings.push(
        `#${i.number} の Target (${md(i.target)}) がマイルストーン期日 (${md(i.dueOn)}) を超過`,
      )
    if (!i.isEpic && !i.sized && i.start)
      warnings.push(`#${i.number} は Size 未設定 (1枠として計算)`)
  }
  if (warnings.length) console.log(`\n■ 警告\n${warnings.map((w) => `  ⚠ ${w}`).join('\n')}`)
}

function closure(issues, from, key) {
  const seen = new Set()
  const walk = (n) => {
    for (const next of issues.get(n)?.[key] ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      walk(next)
    }
  }
  walk(from)
  return [...seen].map((n) => issues.get(n)).filter(Boolean)
}

function impact(issues, number) {
  const target = issues.get(number)
  if (!target) throw new Error(`#${number} が見つかりません`)
  console.log(`対象: ${line(target)}  [${target.milestone}]`)
  const section = (label, list) => {
    const open = list.filter((i) => i.open).sort((a, b) => a.number - b.number)
    const slots = open.reduce((s, i) => s + i.slots, 0)
    console.log(`\n■ ${label}: ${open.length}件 / ${slots}枠`)
    for (const [title, group] of Map.groupBy(open, (i) => i.milestone)) {
      console.log(`  [${title}]`)
      for (const i of group) console.log(`    ${line(i)}`)
    }
  }
  section('先行 (これが終わらないと着手できない)', closure(issues, number, 'blockedBy'))
  section('後続 (この Issue が遅れる・変わると影響を受ける)', closure(issues, number, 'blocking'))
}

function throughput(issues) {
  const done = [...issues.values()]
    .filter((i) => !i.isEpic && i.mergedAt && i.startedAt)
    .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt))
  if (!done.length) {
    console.log('マージ済み PR で閉じられた Issue がまだありません。')
    return
  }
  // 日付は JST で数える
  const jstDay = (iso) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10)
  const hours = (i) => (Date.parse(i.mergedAt) - Date.parse(i.startedAt)) / 3600e3
  console.log('■ Issue ごとのリードタイム (着手 → merge の経過時間。休憩・就寝も含む)')
  for (const i of done) {
    console.log(
      `  ${md(jstDay(i.mergedAt))} #${String(i.number).padEnd(3)} ${i.slots}枠 ${hours(i).toFixed(1).padStart(6)}h  PR #${i.pr}  ${i.title}`,
    )
  }
  const byDay = Map.groupBy(done, (i) => jstDay(i.mergedAt))
  console.log('\n■ 稼働日ごとの消化枠数 (merge 日基準)')
  for (const [day, list] of byDay) {
    const slots = list.reduce((s, i) => s + i.slots, 0)
    console.log(`  ${md(day)} ${'█'.repeat(slots)} ${slots}枠 (${list.length}件)`)
  }
  const total = done.reduce((s, i) => s + i.slots, 0)
  const sorted = done.map(hours).sort((a, b) => a - b)
  const perDay = total / byDay.size
  console.log(
    `\n■ 実績: ${perDay.toFixed(1)}枠/稼働日 (計画 ${SLOTS_PER_DAY}枠/日, ${total}枠 / ${byDay.size}稼働日)`,
  )
  console.log(`  リードタイム中央値: ${sorted[Math.floor(sorted.length / 2)].toFixed(1)}h`)
  const remaining = [...issues.values()].filter((i) => i.open).reduce((s, i) => s + i.slots, 0)
  console.log(
    `  残り ${remaining}枠 → 実績ペースで あと ${Math.ceil(remaining / perDay)}稼働日 (計画ペースなら ${Math.ceil(remaining / SLOTS_PER_DAY)}稼働日)`,
  )
}

const [command, arg] = process.argv.slice(2)
const issueNumber = Number(arg?.replace('#', ''))
if (command === 'status') status(loadIssues())
else if (command === 'impact' && issueNumber) impact(loadIssues(), issueNumber)
else if (command === 'throughput') throughput(loadIssues())
else {
  console.log(`使い方:
  node scripts/plan.mjs status          マイルストーンごとの残り枠・日ごとの枠数・警告
  node scripts/plan.mjs impact <issue>  指定 Issue の先行 / 後続 (依存関係をたどった影響範囲)
  node scripts/plan.mjs throughput      着手 → merge の実績と、実績ペースでの残り日数`)
  process.exit(command ? 1 : 0)
}
