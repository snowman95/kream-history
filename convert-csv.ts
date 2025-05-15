const fs = require('fs')

// 명령행 인수 처리
const args = process.argv.slice(2)
let inputFile = 'history.json' // 기본값

// 명령행에서 파일명 추출
if (args.length > 0) {
  inputFile = args[0]
}

console.log(`입력 파일: ${inputFile}`)

interface PurchaseHistory {
  코드: string
  정산금액: string
  판매가: string
  수수료: string
  거래일시: string
  정산계좌: string
  예금주: string
  '시작 일시': string
  '종료 일시': string
  '창고 이용료': string
  '다음 결제일': string
  '총 결제금액': string
  '보관 번호': string
  '신청 일시': string
  '받는 분': string
  연락처: string
  주소: string
  요청사항: string
  '총 구매가': string
  '총 검수비': string
  '총 수수료': string
  '총 배송비': string
  '총 쿠폰 사용': string
  '총 포인트 사용': string
  '거래 일시': string
  결제수단: string
}

// 파일이 존재하는지 확인
if (!fs.existsSync(inputFile)) {
  console.error(`오류: ${inputFile} 파일을 찾을 수 없습니다.`)
  console.log('사용법: pnpm convert [파일명.json]')
  process.exit(1)
}

// JSON 파일 읽기
const purchaseHistory: PurchaseHistory[] = JSON.parse(
  fs.readFileSync(inputFile, 'utf-8'),
)

const notionHeader = [
  '날짜',
  '제목',
  '정가',
  '구매 수수료',
  '이벤트 할인',
  '최종 구매가',
  '판매가',
  '판매 수수료',
  '포인트사용(크림)',
  '포인트사용(네이버)',
  '포인트사용(토스)',
  '최종 판매가',
  '기타 지출',
  '기타 수입',
  '메모',
]
type NotionHeader = (typeof notionHeader)[number]

function formatDateString(dateString: string) {
  if (!dateString) {
    return ''
  }
  // 날짜 문자열을 '/'로 분리
  const [year, month, day] = dateString?.split(' ')[0].split('/')

  // 연도를 4자리로 변환
  const fullYear = `20${year}`

  // 월과 일을 2자리 숫자로 패딩
  const paddedMonth = month.padStart(2, '0')
  const paddedDay = day.padStart(2, '0')

  // 원하는 형식으로 조합
  return `${fullYear}-${paddedMonth}-${paddedDay}`
}

function parseCurrency(currencyString: string) {
  if (!currencyString || currencyString === '-') {
    return 0
  }
  // 쉼표와 "원"을 제거하고 숫자로 변환
  return (
    parseInt(
      currencyString.replace(/- /g, '').replace(/,/g, '').replace('원', ''),
      10,
    ) || 0
  )
}

// NaN이나 undefined 값을 0으로 변환하는 함수 추가
function safeValue(value: any): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0
  }
  return value
}

// 음수를 양수로 변환하는 함수 추가
function absValue(value: number): number {
  return Math.abs(value)
}

// 현재 시간을 포함한 파일명 생성 함수
function getTimeBasedFileName() {
  const now = new Date()
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
  return `history_${timestamp}.csv`
}

// 입력 파일명에서 확장자를 제거하고 기본 이름 추출
function getBaseFileName(filePath: string): string {
  const parts = filePath.split('.')
  if (parts.length > 1) {
    parts.pop() // 확장자 제거
  }
  return parts.join('.')
}

console.log('purchaseHistory.length', purchaseHistory.length)

// 탭으로 구분된 데이터 생성
const rows = purchaseHistory.reverse().map(item => {
  const emptyObject: Record<NotionHeader, string> = Object.fromEntries(
    notionHeader.map(field => [field, '']),
  )
  const 구매가 = safeValue(parseCurrency(item['총 구매가']))
  const 구매수수료 = safeValue(parseCurrency(item['총 수수료']))
  const 판매가 = safeValue(parseCurrency(item['판매가']))
  const 판매수수료 = safeValue(parseCurrency(item['수수료']))
  const 포인트 =
    item['총 포인트 사용'] !== '-'
      ? safeValue(parseCurrency(item['총 포인트 사용']))
      : 0

  emptyObject['날짜'] = formatDateString(item['거래 일시'])
  emptyObject['제목'] = item['코드']
  emptyObject['정가'] = 구매가.toString()
  emptyObject['구매 수수료'] = 구매수수료.toString()
  emptyObject['이벤트 할인'] = '0'
  emptyObject['최종 구매가'] = (구매가 - 구매수수료).toString()
  emptyObject['판매가'] = 판매가.toString()
  emptyObject['판매 수수료'] = 판매수수료.toString()
  emptyObject['포인트사용(크림)'] = 포인트.toString()
  emptyObject['포인트사용(네이버)'] = '0'
  emptyObject['포인트사용(토스)'] = '0'
  emptyObject['최종 판매가'] = (판매가 - 판매수수료).toString()
  emptyObject['기타 지출'] = '0'
  emptyObject['기타 수입'] = '0'

  // 차익 계산 시 음수 값을 양수로 변환
  // const 차익 = 판매가 - 구매가 - 구매수수료 - 판매수수료
  // emptyObject['차익'] = absValue(차익).toString()

  let 결제수단 = item['결제수단'] || ''

  emptyObject['메모'] = 결제수단

  // 모든 값이 확실히 정의되어 있는지 확인
  for (const key of notionHeader) {
    if (emptyObject[key] === undefined || emptyObject[key] === null) {
      emptyObject[key] = '0' // 누락된 값을 0으로 채움
    }
  }

  return Object.values(emptyObject).join(',')
})
console.log('rows', rows)

// CSV 헤더와 행의 열 개수 확인
const headerColumns = notionHeader.length
console.log(`헤더 열 개수: ${headerColumns}`)

// 각 행의 열 개수 검증
let hasError = false
rows.forEach((row, index) => {
  const columns = row.split(',').length
  if (columns !== headerColumns) {
    console.error(
      `오류: ${index + 1}번째 행의 열 개수(${columns})가 헤더 열 개수(${headerColumns})와 일치하지 않습니다.`,
    )
    hasError = true
  }
})

if (hasError) {
  console.log('CSV 형식 오류가 있습니다. 문제를 해결 후 파일이 생성됩니다.')
}

const csvData = [notionHeader.join(','), ...rows].join('\n')

// 시간 기반 파일명 생성
const timeBasedFileName = getTimeBasedFileName()
// 입력 파일명 기반 출력 파일명
const baseFileName = getBaseFileName(inputFile)
const baseOutputFile = `${baseFileName}.csv`

// 파일로 저장
fs.writeFileSync(timeBasedFileName, csvData)
fs.writeFileSync(baseOutputFile, csvData) // 기본 이름으로도 저장

console.log(`CSV 파일이 생성되었습니다:`)
console.log(`1. 시간 기반 파일: ${timeBasedFileName}`)
console.log(`2. 기본 파일: ${baseOutputFile}`)
