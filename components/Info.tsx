import { formatUnits, parseUnits } from "viem"
import { useAccount, useBalance } from "wagmi"

const Info = () => {
  const { address } = useAccount()
  const { data, error } = useBalance({ address })
  const { data: rccTokenData } = useBalance({ address, token: '0x6FCE5Dd421c88B7df4552E037362Bcea35Ae0AcB' })
  console.log(data, 'balance')

  // parseUnits()

  return (
    <div>
      <div>Address: {address}</div>
      {
        data && <div>ETH Balance: {data?.formatted} ------- formatted{formatUnits(data?.value, 18)}</div>
      }
      <div>Rcc Balance: {rccTokenData?.formatted}</div>
    </div>
  )
}

export default Info