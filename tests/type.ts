export type OrderData = {
  '상품 개수': number
  '총 구매가': string
  '총 수수료': string
  '총 포인트사용': string
  '거래 일시': string
  결제수단: string
}

export type InventoryData = {
  코드: string
  판매가: string
  수수료: string
}

export type KreamData = {
  orderData: OrderData
  inventories: InventoryData[]
}
