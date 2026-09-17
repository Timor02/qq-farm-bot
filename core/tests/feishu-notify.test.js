const assert = require('node:assert/strict');
const test = require('node:test');

const {
    DEFAULT_FEISHU_NOTIFY_CONFIG,
    assertFeishuNotifyConfig,
    buildFeishuWebhookPayload,
    normalizeFeishuWebhookUrl,
    buildStealNotificationText,
    normalizeFeishuNotifyConfig,
} = require('../dist/services/feishu-notify');

test('normalizeFeishuNotifyConfig trims the webhook URL and ignores CLI fields', () => {
    const config = normalizeFeishuNotifyConfig({
        enabled: true,
        webhookUrl: ' https://open.feishu.cn/open-apis/bot/v2/hook/test ',
        command: 'lark-cli',
        receiverType: 'chat',
        receiverId: 'oc_test',
    });

    assert.equal(config.enabled, true);
    assert.equal(config.webhookUrl, 'https://open.feishu.cn/open-apis/bot/v2/hook/test');
});

test('normalizeFeishuNotifyConfig falls back to disabled defaults', () => {
    assert.deepEqual(normalizeFeishuNotifyConfig(null), DEFAULT_FEISHU_NOTIFY_CONFIG);
});

test('buildStealNotificationText deduplicates crop names', () => {
    const text = buildStealNotificationText({
        accountName: ' farm ',
        count: 2,
        cropNames: ['白菜', '萝卜', '白菜'],
        victimNames: ['张三', '李四', '张三'],
    });

    assert.equal(text, '【QQ农场】偷菜提醒\n账号：farm\n被偷好友：张三/李四\n数量：2\n作物：白菜/萝卜');
});

test('enabled notify config requires a webhook URL', () => {
    assert.throws(
        () => assertFeishuNotifyConfig({ enabled: true, webhookUrl: '' }),
        /Webhook 地址/,
    );
});

test('normalizeFeishuWebhookUrl accepts official hooks only', () => {
    assert.equal(
        normalizeFeishuWebhookUrl('https://open.feishu.cn/open-apis/bot/v2/hook/test-token/'),
        'https://open.feishu.cn/open-apis/bot/v2/hook/test-token',
    );
    assert.throws(
        () => normalizeFeishuWebhookUrl('https://example.com/open-apis/bot/v2/hook/test'),
        /官方群机器人/,
    );
});

test('buildFeishuWebhookPayload uses Feishu text message format', () => {
    assert.deepEqual(buildFeishuWebhookPayload('hello'), {
        msg_type: 'text',
        content: { text: 'hello' },
    });
});
