/* tslint:disable */
/* eslint-disable */
/**
* @param {string} canvas_id
*/
export function apply_red_filter(canvas_id: string): void;
/**
* @param {string} canvas_id
*/
export function apply_yellow_filter(canvas_id: string): void;
/**
* @param {string} canvas_id
*/
export function apply_green_filter(canvas_id: string): void;
/**
* @param {string} canvas_id
*/
export function apply_blue_filter(canvas_id: string): void;
/**
* @param {string} canvas_id
*/
export function apply_blur_filter(canvas_id: string): void;
/**
* @param {string} data_url
*/
export function save_canvas_snapshot(data_url: string): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly apply_red_filter: (a: number, b: number) => void;
  readonly apply_yellow_filter: (a: number, b: number) => void;
  readonly apply_green_filter: (a: number, b: number) => void;
  readonly apply_blue_filter: (a: number, b: number) => void;
  readonly apply_blur_filter: (a: number, b: number) => void;
  readonly save_canvas_snapshot: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
