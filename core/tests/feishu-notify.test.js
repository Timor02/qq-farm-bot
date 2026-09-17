const assert = require('node:assert/strict');
const test = require('node:test');

const {
    DEFAULT_FEISHU_NOTIFY_CONFIG,
    buildFeishuCliArgs,
    buildStealNotificationText,
    normalizeFeishuNotifyConfig,
} = require('../dist/services/feishu-notify');

test('normalizeFeishuNotifyConfig trims values and keeps only supported receivers', () => {
    const config = normalizeFeishuNotifyConfig({
        enabled: true,
        command: '  lark-cli  ',
        receiverType: 'CHAT',
        receiverId: ' oc_test ',
    });

    assert.equal(config.enabled, true);
    assert.equal(config.command, 'lark-cli');
    assert.equal(config.receiverType, 'chat');
    assert.equal(config.receiverId, 'oc_test');
});

test('normalizeFeishuNotifyConfig falls back to disabled defaults', () => {
    assert.deepEqual(normalizeFeishuNotifyConfig(null), DEFAULT_FEISHU_NOTIFY_CONFIG);
});

test('buildFeishuCliArgs uses user and chat receiver flags', () => {
    const text = buildStealNotificationText({
        accountName: ' farm ',
        count: 2,
        cropNames: ['白菜', '萝卜', '白菜'],
    });

    const userArgs = buildFeishuCliArgs({
        enabled: true,
        command: 'lark-cli',
        receiverType: 'user',
        receiverId: 'ou_test',
    }, text);
    const chatArgs = buildFeishuCliArgs({
        enabled: true,
        command: 'lark-cli',
        receiverType: 'chat',
        receiverId: 'oc_test',
    }, text);

    assert.deepEqual(userArgs, ['im', '+messages-send', '--user-id', 'ou_test', '--text', text]);
    assert.deepEqual(chatArgs, ['im', '+messages-send', '--chat-id', 'oc_test', '--text', text]);
    assert.equal(text, '【QQ农场】偷菜提醒\n账号：farm\n数量：2\n作物：白菜/萝卜');
});

test('buildFeishuCliArgs rejects an enabled config without receiver', () => {
    assert.throws(
        () => buildFeishuCliArgs({ enabled: true, command: 'lark-cli', receiverType: 'user', receiverId: '' }, 'text'),
        /接收对象 ID/,
    );
});
