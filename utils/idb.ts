import {
	type UseStore,
	del as delIdb,
	get as getIdb,
	promisifyRequest,
	set as setIdb,
	update as updateIdb
} from 'idb-keyval'

const databases: IDBOpenDBRequest[] = []

function createStore(): UseStore {
	const storeName = 'keyval'
	const request = indexedDB.open('keyval-store')
	databases.push(request)
	request.onupgradeneeded = () => request.result.createObjectStore(storeName)
	const dbp = promisifyRequest(request)
	return (txMode, callback) =>
		dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)))
}

let defaultGetStoreFunc: UseStore | undefined
function defaultGetStore(): UseStore | undefined {
	if (process.prerender) {
		return
	}
	if (!defaultGetStoreFunc) defaultGetStoreFunc = createStore()

	return defaultGetStoreFunc
}

export function get<T = any>(key: IDBValidKey): Promise<T | undefined> | undefined {
	if (process.prerender) {
		return
	}
	return getIdb<T>(key, defaultGetStore())
}

export function set(key: IDBValidKey, value: any): Promise<void> | undefined {
	if (process.prerender) {
		return
	}
	return setIdb(key, value, defaultGetStore())
}

export function update<T = any>(
	key: IDBValidKey,
	updater: (oldValue: T | undefined) => T
): Promise<void> | undefined {
	if (process.prerender) {
		return
	}
	return updateIdb(key, updater, defaultGetStore())
}

export function del(key: IDBValidKey): Promise<void> | undefined {
	if (process.prerender) {
		return
	}
	return delIdb(key, defaultGetStore())
}

export function closeDatabases(): void {
	if (process.prerender) {
		return
	}
	databases.forEach((db) => {
		if (db.result) db.result.close()
	})
	defaultGetStoreFunc = undefined
}
