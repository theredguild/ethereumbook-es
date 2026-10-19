import { decodeEventLog, decodeFunctionResult, encodeAbiParameters, encodeFunctionData } from 'viem/utils'

export function callData(abi, functionName, args = []) {
  return encodeFunctionData({ abi, functionName, args })
}

export function constructorData(abi, args = []) {
  const constructor = abi.find((item) => item.type === 'constructor')
  return encodeAbiParameters(constructor?.inputs || [], args)
}

export function readResult(abi, functionName, data) {
  return decodeFunctionResult({ abi, functionName, data })
}

export function decodeLogs(abi, logs) {
  return logs.map((log) => {
    try { return { ...log, decoded: decodeEventLog({ abi, topics: log.topics, data: log.data }) } }
    catch { return { ...log, decoded: null } }
  })
}
