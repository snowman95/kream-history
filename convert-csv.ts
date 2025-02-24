const fs = require('fs')

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
  '연락처': string
  '주소': string
  '요청사항': string
  '총 구매가': string
  '총 검수비': string
  '총 수수료': string
  '총 배송비': string
  '총 쿠폰 사용': string
  '총 포인트 사용': string
  '거래 일시': string
  '결제수단': string
}

// JSON 파일 읽기
const purchaseHistory: PurchaseHistory[] = JSON.parse(
  fs.readFileSync('history.json', 'utf-8'),
)

const notionHeader = [
  '날짜',
  '제목',
  '정가',
  '구매 수수료',
  '추가 할인',
  '최종 구매가',
  '판매가',
  '판매 수수료',
  '포인트 사용',
  '최종 판매가',
  '기타 지출',
  '기타 수입',
  '차익',
  '메모',
]
type NotionHeader = (typeof notionHeader)[number]

function formatDateString(dateString: string) {
  // 날짜 문자열을 '/'로 분리
  const [year, month, day] = dateString.split(' ')[0].split('/')

  // 연도를 4자리로 변환
  const fullYear = `20${year}`

  // 원하는 형식으로 조합
  return `${fullYear}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`
}

function parseCurrency(currencyString: string) {
  if(!currencyString){
    return 0
  }
  // 쉼표와 "원"을 제거하고 숫자로 변환
  return parseInt(currencyString.replace(/- /g, '').replace(/,/g, '').replace('원', ''), 10);
}

console.log('purchaseHistory.length', purchaseHistory.length)

// 탭으로 구분된 데이터 생성
const rows = purchaseHistory.reverse().map(item => {
  const emptyObject : Record<NotionHeader, string> = Object.fromEntries(notionHeader.map(field => [field, '']))
  const 구매가 = parseCurrency(item['총 구매가'])
  const 구매수수료 = parseCurrency(item['총 수수료'])
  const 판매가 = parseCurrency(item['판매가'])
  const 판매수수료 = parseCurrency(item['수수료'])
  const 포인트 = item['총 포인트 사용'] !== '-' ? parseCurrency(item['총 포인트 사용']) : 0

  emptyObject['날짜'] = formatDateString(item['거래 일시'])
  emptyObject['제목'] = item['코드']
  emptyObject['정가'] = (구매가).toString()
  emptyObject['구매 수수료'] = (구매수수료).toString()
  emptyObject['추가 할인'] = '0'
  emptyObject['최종 구매가'] = (구매가 - 구매수수료).toString()
  emptyObject['판매가'] = (판매가).toString()
  emptyObject['판매 수수료'] = (판매수수료).toString()
  emptyObject['포인트 사용'] = (포인트).toString()
  emptyObject['최종 판매가'] = (판매가 - 판매수수료).toString()
  emptyObject['기타 지출'] = '0'
  emptyObject['기타 수입'] = '0'
  emptyObject['차익'] = (판매가 - 구매가 - 구매수수료 - 판매수수료).toString()
  emptyObject['메모'] = item['결제수단'] || ''

  return Object.values(emptyObject).join(',')
})
console.log('rows',rows);


const csvData = [notionHeader.join(','), ...rows].join('\n')

// 파일로 저장
fs.writeFileSync('history.csv', csvData)
console.log('CSV 파일이 생성되었습니다: history.csv')



// 아래는 마크다운 형식으로 변환

// const fs = require('fs')
// const { exec } = require('child_process');

// interface PurchaseHistory {
//   코드: string
//   정산금액: string
//   판매가: string
//   수수료: string
//   거래일시: string
//   정산계좌: string
//   예금주: string
//   '시작 일시': string
//   '종료 일시': string
//   '창고 이용료': string
//   '다음 결제일': string
//   '총 결제금액': string
//   '보관 번호': string
//   '신청 일시': string
//   '받는 분': string
//   '연락처': string
//   '주소': string
//   '요청사항': string
//   '총 구매가': string
//   '총 검수비': string
//   '총 수수료': string
//   '총 배송비': string
//   '총 쿠폰 사용': string
//   '총 포인트 사용': string
//   '거래 일시': string
// }

// // JSON 파일 읽기
// const purchaseHistory: PurchaseHistory[] = JSON.parse(
//   fs.readFileSync('history.json', 'utf-8'),
// )

// const notionHeader = [
//   '날짜',
//   '제목',
//   '정가',
//   '구매 수수료',
//   '추가 할인',
//   '최종 구매가',
//   '판매가',
//   '판매 수수료',
//   '포인트 사용',
//   '최종 판매가',
//   '기타 지출',
//   '기타 수입',
//   '차익',
//   '메모',
// ]
// type NotionHeader = (typeof notionHeader)[number]

// function formatDateString(dateString: string) {
//   // 날짜 문자열을 '/'로 분리
//   const [year, month, day] = dateString.split(' ')[0].split('/')

//   // 연도를 4자리로 변환
//   const fullYear = `20${year}`

//   // 원하는 형식으로 조합
//   return `${fullYear}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`
// }

// function parseCurrency(currencyString: string) {
//   if(!currencyString){
//     return 0
//   }
//   // 쉼표와 "원"을 제거하고 숫자로 변환
//   return parseInt(currencyString.replace(/- /g, '').replace(/,/g, '').replace('원', ''), 10);
// }

// console.log('purchaseHistory.length', purchaseHistory.length)

// // 탭으로 구분된 데이터 생성
// const rows = purchaseHistory.map(item => {
//   const emptyObject : Record<NotionHeader, string> = Object.fromEntries(notionHeader.map(field => [field, '']))
//   const 구매가 = parseCurrency(item['총 구매가'])
//   const 구매수수료 = parseCurrency(item['총 수수료'])
//   const 판매가 = parseCurrency(item['판매가'])
//   const 판매수수료 = parseCurrency(item['수수료'])
//   const 포인트 = item['총 포인트 사용'] !== '-' ? parseCurrency(item['총 포인트 사용']) : 0

//   emptyObject['날짜'] = formatDateString(item['거래 일시'])
//   emptyObject['제목'] = item['코드']
//   emptyObject['정가'] = (구매가).toString()
//   emptyObject['구매 수수료'] = (구매수수료).toString()
//   emptyObject['추가 할인'] = '0'
//   emptyObject['최종 구매가'] = (구매가 - 구매수수료).toString()
//   emptyObject['판매가'] = (판매가).toString()
//   emptyObject['판매 수수료'] = (판매수수료).toString()
//   emptyObject['포인트 사용'] = (포인트).toString()
//   emptyObject['최종 판매가'] = (판매가 - 판매수수료).toString()
//   emptyObject['기타 지출'] = '0'
//   emptyObject['기타 수입'] = '0'
//   emptyObject['차익'] = (판매가 - 구매가 - 구매수수료 - 판매수수료).toString()
//   emptyObject['메모'] = ''

// //   return Object.values(emptyObject).join(',')
// return `| ${Object.values(emptyObject).join(' | ')} |`;

// })


// // const csvData = [notionHeader.join(','), ...rows].join('\n')

// // Markdown 테이블 생성
// const markdownHeader = `| ${notionHeader.join(' | ')} |`;
// const markdownSeparator = `| ${notionHeader.map(() => '---').join(' | ')} |`;
// const markdownTable = [markdownHeader, markdownSeparator, ...rows].join('\n');


// // 파일로 저장
// // fs.writeFileSync('history.csv', csvData)
// // console.log('CSV 파일이 생성되었습니다: history.csv')

// const filePath = 'history.md';
// fs.writeFile(filePath, markdownTable, (err:any) => {
//   if (err) {
//     console.error('파일을 저장할 수 없습니다:', err);
//     return;
//   }
//   console.log('Markdown 파일이 생성되었습니다:', filePath);

// });