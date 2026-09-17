/**
 * 飞书 CLI 通知封装。
 */

import type { FeishuNotifyConfig } from '../types/config';
export {};

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const CLI_TIMEOUT_MS = 30_000;

export const DEFAULT_FEISHU_NOTIFY_CONFIG: FeishuNotifyConfig = {
    enabled: false,
    command: 'lark-cli',
    receiverType: 'user',
    receiverId: '',
};

export function normalizeFeishuNotifyConfig(input: unknown): FeishuNotifyConfig {
    const src: Record<string, any> = (input && typeof input === 'object') ? input as Record<string, any> : {};
    const receiverType = String(src.receiverType || DEFAULT_FEISHU_NOTIFY_CONFIG.receiverType).trim().toLowerCase();
    return {
        enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_FEISHU_NOTIFY_CONFIG.enabled,
        command: (typeof src.command === 'string' && src.command.trim())
            ? src.command.trim()
            : DEFAULT_FEISHU_NOTIFY_CONFIG.command,
        receiverType: receiverType === 'chat' ? 'chat' : 'user',
        receiverId: typeof src.receiverId === 'string' ? src.receiverId.trim() : DEFAULT_FEISHU_NOTIFY_CONFIG.receiverId,
    };
}

export function assertFeishuNotifyConfig(config: FeishuNotifyConfig): void {
    if (config.enabled && !config.receiverId) {
        throw new Error('开启飞书偷菜提醒前，请配置接收对象 ID');
    }
}

export function buildFeishuCliArgs(config: FeishuNotifyConfig, text: string): string[] {
    const normalized = normalizeFeishuNotifyConfig(config);
    assertFeishuNotifyConfig(normalized);
    return [
        'im',
        '+messages-send',
        normalized.receiverType === 'chat' ? '--chat-id' : '--user-id',
        normalized.receiverId,
        '--text',
        text,
    ];
}

export async function sendFeishuCliMessage(
    config: FeishuNotifyConfig,
    text: string,
): Promise<{ ok: boolean; code: string; msg: string; raw: any }> {
    const normalized = normalizeFeishuNotifyConfig(config);
    if (!normalized.enabled) {
        return { ok: false, code: 'DISABLED', msg: '飞书偷菜提醒未开启', raw: null };
    }
    if (!normalized.receiverId) {
        return { ok: false, code: 'INVALID_CONFIG', msg: '飞书接收对象 ID 不能为空', raw: null };
    }

    try {
        const result: any = await execFileAsync(normalized.command, buildFeishuCliArgs(normalized, text), {
            timeout: CLI_TIMEOUT_MS,
            windowsHide: true,
            shell: process.platform === 'win32',
        });
        return {
            ok: true,
            code: 'ok',
            msg: '飞书消息已发送',
            raw: { stdout: result.stdout, stderr: result.stderr },
        };
    }
    catch (error: any) {
        return {
            ok: false,
            code: String(error?.code || 'CLI_FAILED'),
            msg: error?.message || '飞书 CLI 消息发送失败',
            raw: { stdout: error?.stdout, stderr: error?.stderr },
        };
    }
}

export interface StealNotificationInput {
    accountName?: string;
    count?: number;
    cropNames?: string[];
}

export function buildStealNotificationText(input: StealNotificationInput): string {
    const accountName = String(input.accountName || '').trim() || '未命名账号';
    const count = Math.max(0, Number(input.count) || 0);
    const cropNames = [...new Set((input.cropNames || [])
        .map(name => String(name || '').trim())
        .filter(Boolean))].join('/');
    return [
        '【QQ农场】偷菜提醒',
        `账号：${accountName}`,
        `数量：${count}`,
        `作物：${cropNames || '未知'}`,
    ].join('\n');
}
