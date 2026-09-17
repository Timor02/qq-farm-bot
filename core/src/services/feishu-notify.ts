/**
 * 飞书群机器人通知封装。
 */

import type { FeishuNotifyConfig } from '../types/config';
export {};

const axios = require('axios').default;

const WEBHOOK_TIMEOUT_MS = 10_000;
const WEBHOOK_HOSTS = new Set(['open.feishu.cn', 'open.larksuite.com']);

export const DEFAULT_FEISHU_NOTIFY_CONFIG: FeishuNotifyConfig = {
    enabled: false,
    webhookUrl: '',
};

export function normalizeFeishuNotifyConfig(input: unknown): FeishuNotifyConfig {
    const src: Record<string, any> = (input && typeof input === 'object') ? input as Record<string, any> : {};
    return {
        enabled: typeof src.enabled === 'boolean' ? src.enabled : DEFAULT_FEISHU_NOTIFY_CONFIG.enabled,
        webhookUrl: typeof src.webhookUrl === 'string' ? src.webhookUrl.trim() : DEFAULT_FEISHU_NOTIFY_CONFIG.webhookUrl,
    };
}

export function assertFeishuNotifyConfig(config: FeishuNotifyConfig): void {
    if (!config.enabled) return;
    if (!config.webhookUrl) {
        throw new Error('开启飞书偷菜提醒前，请配置群机器人 Webhook 地址');
    }
}

export function normalizeFeishuWebhookUrl(input: unknown): string {
    const raw = String(input || '').trim();
    let parsed: URL;
    try {
        parsed = new URL(raw);
    }
    catch {
        throw new Error('飞书群机器人 Webhook 地址无效');
    }
    if (parsed.protocol !== 'https:' || !WEBHOOK_HOSTS.has(parsed.hostname)) {
        throw new Error('仅支持飞书官方群机器人 Webhook 地址');
    }
    if (!parsed.pathname.startsWith('/open-apis/bot/v2/hook/')) {
        throw new Error('飞书群机器人 Webhook 地址格式无效');
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '') + parsed.search;
}

export function buildFeishuWebhookPayload(text: string): Record<string, unknown> {
    return {
        msg_type: 'text',
        content: { text },
    };
}

export async function sendFeishuWebhookMessage(
    config: FeishuNotifyConfig,
    text: string,
): Promise<{ ok: boolean; code: string; msg: string; raw: any }> {
    const normalized = normalizeFeishuNotifyConfig(config);
    if (!normalized.enabled) return { ok: false, code: 'DISABLED', msg: '飞书偷菜提醒未开启', raw: null };
    try {
        const webhookUrl = normalizeFeishuWebhookUrl(normalized.webhookUrl);
        const response: any = await axios.post(webhookUrl, buildFeishuWebhookPayload(text), {
            timeout: WEBHOOK_TIMEOUT_MS,
            headers: { 'Content-Type': 'application/json' },
        });
        const raw = response?.data;
        const code = String(raw?.code ?? raw?.StatusCode ?? 0);
        const ok = code === '0';
        return {
            ok,
            code,
            msg: String(raw?.msg || raw?.statusMessage || (ok ? '飞书消息已发送' : '飞书 Webhook 返回失败')),
            raw,
        };
    }
    catch (error: any) {
        return {
            ok: false,
            code: String(error?.code || 'WEBHOOK_FAILED'),
            msg: error?.message || '飞书 Webhook 消息发送失败',
            raw: error?.response?.data || null,
        };
    }
}

export interface StealNotificationInput {
    accountName?: string;
    count?: number;
    cropNames?: string[];
    victimNames?: string[];
}

export function buildStealNotificationText(input: StealNotificationInput): string {
    const accountName = String(input.accountName || '').trim() || '未命名账号';
    const count = Math.max(0, Number(input.count) || 0);
    const cropNames = [...new Set((input.cropNames || [])
        .map(name => String(name || '').trim())
        .filter(Boolean))].join('/');
    const victimNames = [...new Set((input.victimNames || [])
        .map(name => String(name || '').trim())
        .filter(Boolean))].join('/');
    return [
        '【QQ农场】偷菜提醒',
        `账号：${accountName}`,
        `被偷好友：${victimNames || '未知'}`,
        `数量：${count}`,
        `作物：${cropNames || '未知'}`,
    ].join('\n');
}
