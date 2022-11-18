'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { CSVLink } from 'react-csv'

interface Marker {
  ledger: number
  seq: number
}

interface Tx {
  Account: string
  Amount: string
  Destination: string
  DestinatonTag: number
  Fee: string
  LastLedgerSequence: number
  Sequence: number
  SigningPubKey: string
  TransactionType: string
  TxnSignature: string
  date: number
  hash: string
  inLedger: number
  ledger_index: number
}

interface Transaction {
  meta: any
  tx: Tx
  validated: boolean
}

interface AccountTransactionsResult {
  result: {
    account: string
    ledger_index_max: number
    ledger_index_min: number
    limit: number
    marker: Marker
    status: string
    transactions: Transaction[]
    validated: boolean
    error?: string
    error_code?: number
  }
}

export default function Search() {
  const [pageSize, setPageSize] = useState(10)
  const [lastSearchedAddress, setLastSearchedAddress] = useState('')
  const [address, setAddress] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [txns, setTxns] = useState<Tx[]>([])

  // rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w

  const getTransactionsForCSV = () => {
    const txns: Tx[] = []

    data?.pages.forEach(page => {
      page.result.transactions.forEach(txn => txns.push(txn.tx))
    })

    setTxns(txns)
  }

  const fetchTransactions = async ({ pageParam = undefined }) => {
    const res = await fetch('https://xrplcluster.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'account_tx',
        params: [
          {
            api_version: 1,
            account: address,
            binary: false,
            forward: false,
            ledger_index_max: -1,
            ledger_index_min: -1,
            limit: pageSize,
            marker: pageParam !== undefined ? pageParam : undefined,
          },
        ],
      }),
      keepalive: true,
    })

    return res.json()
  }

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery<AccountTransactionsResult>({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    getNextPageParam: (lastPage, pages) => lastPage.result.marker,
    enabled: false,
    refetchOnWindowFocus: false,
  })

  const search = async () => {
    await refetch()
    setLastSearchedAddress(address)
  }

  const previous = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const next = async () => {
    if (data) {
      if (currentPage >= data.pages.length - 1) {
        await fetchNextPage()
      }
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <>
      <div className="flex flex-col items-center justify-between w-full sm:flex-row space-y-4 sm:space-y-0 my-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setAddress('')}
            className="btn btn-error btn-circle"
          >
            <Image src="/clear.svg" height={24} width={24} alt="search" />
          </button>
          <input
            type="text"
            placeholder="Enter your address"
            className="input input-primary"
            value={address}
            onChange={e => setAddress(e.target.value)}
            disabled={isFetchingNextPage || isFetching}
          />
          <button
            onClick={search}
            className={`btn btn-primary btn-circle ${
              (isFetching || isFetchingNextPage) && 'loading'
            }`}
          >
            {!isFetching && !isFetchingNextPage && (
              <Image src="/search.svg" height={24} width={24} alt="search" />
            )}
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={previous}
            className="btn btn-accent btn-circle"
            disabled={currentPage === 0 || status !== 'success'}
          >
            <Image src="/arrow_back.svg" height={24} width={24} alt="search" />
          </button>
          <button
            onClick={next}
            className="btn btn-accent btn-circle"
            disabled={
              status !== 'success' ||
              isFetchingNextPage ||
              !!data.pages[currentPage].result.error ||
              (currentPage === data.pages.length - 1 &&
                address !== lastSearchedAddress)
            }
          >
            <Image
              src="/arrow_forward.svg"
              height={24}
              width={24}
              alt="search"
            />
          </button>
          <select
            className="select select-secondary"
            value={pageSize}
            onChange={e => setPageSize(parseInt(e.target.value))} // reset search
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col md:flex-row w-full md:justify-between">
        <p>Example account: rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w</p>
        <div className="flex md:justify-end space-x-2 w-full mb-4">
          <button
            onClick={getTransactionsForCSV}
            className={`btn btn-success ${
              (!data || data?.pages.length === 0) && 'btn-disabled'
            }`}
          >
            Prepare CSV
          </button>
          <CSVLink
            data={txns}
            filename={'txns.csv'}
            className={`btn btn-success ${txns.length === 0 && 'btn-disabled'}`}
            target="_blank"
          >
            Download CSV
          </CSVLink>
        </div>
      </div>

      {!isFetching && status !== 'success' ? undefined : status ===
        'loading' ? (
        <p>Loading...</p>
      ) : status === 'error' ? (
        <p>Error: {error instanceof Error && error.message}</p>
      ) : data.pages[currentPage].result.status === 'success' ? (
        <>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              {/* <!-- head --> */}
              <thead>
                <tr>
                  <th></th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Destination</th>
                </tr>
              </thead>
              <tbody>
                {data.pages[currentPage].result.transactions.map(
                  (transaction, j) => (
                    <tr key={transaction.tx.TxnSignature}>
                      <th>{currentPage * 10 + (j + 1)}</th>
                      <td>{transaction.tx.Account}</td>
                      <td>{transaction.tx.Amount}</td>
                      <td>{transaction.tx.Destination}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : data.pages[currentPage].result.status === 'error' ? (
        <>
          {data.pages[currentPage].result.error_code === 35 ? (
            <p>Invalid account address provided!</p>
          ) : (
            console.log(data.pages[currentPage].result)
          )}
        </>
      ) : (
        <p>Something went wrong and we have no idea what :/</p>
      )}
    </>
  )
}
