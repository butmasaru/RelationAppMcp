export function annotationsFor(t) {
    switch (t.safety) {
        case "read":
            return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
        case "write":
            return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
        case "dangerous":
            return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
        case "master":
            return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };
    }
}
// --- Schema helpers ---
const s = (d) => ({ type: "string", description: d });
const i = (d) => ({ type: "integer", description: d });
const n = (d) => ({ type: "number", description: d });
const b = (d) => ({ type: "boolean", description: d });
const sa = (d) => ({
    type: "array",
    items: { type: "string" },
    description: d,
});
const ia = (d) => ({
    type: "array",
    items: { type: "integer" },
    description: d,
});
const pageProps = {
    page: i("ページ番号（デフォルト1）"),
    per_page: i("1ページあたりの件数"),
};
const mbId = { message_box_id: i("受信箱ID") };
const cgId = { customer_group_id: i("アドレス帳ID") };
// ========== Customer fields (shared by create/update) ==========
const emailObjArray = (d) => ({
    type: "array",
    items: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
    },
    description: d,
});
const telObjArray = (d) => ({
    type: "array",
    items: {
        type: "object",
        properties: { tel: { type: "string" } },
        required: ["tel"],
    },
    description: d,
});
const customerWriteFields = {
    last_name: s("姓"),
    first_name: s("名"),
    last_name_kana: s("姓（カナ）"),
    first_name_kana: s("名（カナ）"),
    company_name: s("会社名"),
    department: s("部署名"),
    title: s("役職"),
    postal_code: s("郵便番号"),
    region: s("都道府県"),
    city: s("市区町村"),
    address1: s("住所1"),
    address2: s("住所2"),
    gender_cd: i("性別コード（1:男性, 2:女性, 9:不明）"),
    url: s("URL"),
    note: s("メモ"),
    system_id1: s("外部システムID（一意制約、重複で400）"),
    default_assignee: s("デフォルト担当者のメンション名（nullで解除）"),
    emails: emailObjArray("メールアドレス配列（最大6件）例: [{email:'a@b.com'}]"),
    archived_emails: emailObjArray("アーカイブ済みメールアドレス配列（最大6件）"),
    tels: telObjArray("電話番号配列（最大3件）例: [{tel:'03-1234-5678'}]"),
    archived_tels: telObjArray("アーカイブ済み電話番号配列（最大3件）"),
    badge_ids: ia("バッジID配列"),
    custom_item1: s("カスタム項目1（最大200文字）"),
    custom_item2: s("カスタム項目2（最大200文字）"),
    custom_item3: s("カスタム項目3（最大200文字）"),
    custom_item4: s("カスタム項目4（最大200文字）"),
    custom_item5: s("カスタム項目5（最大200文字）"),
    custom_item6: s("カスタム項目6（最大200文字）"),
    custom_item7: s("カスタム項目7（最大200文字）"),
    custom_item8: s("カスタム項目8（最大200文字）"),
    custom_item9: s("カスタム項目9（最大200文字）"),
    custom_item10: s("カスタム項目10（最大200文字）"),
};
// ========== Chat common ==========
const chatProps = {
    ...mbId,
    ticket_id: i("チケットID"),
    message_id: i("メッセージID"),
    ...pageProps,
};
const chatRequired = ["message_box_id", "ticket_id", "message_id"];
// ========== Mail common ==========
const mailFields = {
    mail_account_id: i("送信メールアカウントID"),
    to: s("宛先メールアドレス"),
    cc: s("CCメールアドレス"),
    bcc: s("BCCメールアドレス"),
    subject: s("件名（最大200文字）"),
    body: s("本文"),
    is_html: b("HTML形式で送信するか"),
    pending_reason_id: i("保留理由ID"),
};
// ================================================================
//  All 35 Tool Definitions (based on https://developer.ingage.jp/)
// ================================================================
export const allTools = [
    // ===== 1. Customer (8) =====
    {
        name: "relation_customer_search",
        description: "Re:lation のコンタクト（顧客）を検索します。各種条件で絞り込みが可能です。per_page最大50。",
        safety: "read",
        method: "GET",
        path: "/customer_groups/:customer_group_id/customers/search",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                customer_ids: ia("コンタクトID配列で絞り込み"),
                gender_cds: ia("性別コード配列で絞り込み（1:男性, 2:女性, 9:不明）"),
                system_id1s: sa("外部システムID配列で絞り込み"),
                default_assignees: sa("担当者メンション名配列で絞り込み"),
                emails: sa("メールアドレス配列で絞り込み（部分一致）"),
                tels: sa("電話番号配列で絞り込み（部分一致）"),
                badge_ids: ia("バッジID配列で絞り込み"),
                ...pageProps,
            },
            required: ["customer_group_id"],
        },
    },
    {
        name: "relation_customer_create",
        description: "Re:lation に新しいコンタクトを登録します。⚠ データを作成します。実行前に内容を確認してください。",
        safety: "write",
        method: "POST",
        path: "/customer_groups/:customer_group_id/customers/create",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                ...customerWriteFields,
            },
            required: ["customer_group_id", "last_name"],
        },
    },
    {
        name: "relation_customer_update_by_system_id",
        description: "外部システムIDをキーにコンタクト情報を更新します。⚠ データを変更します。空配列でemails/tels/badge_ids削除。",
        safety: "write",
        method: "PUT",
        path: "/customer_groups/:customer_group_id/customers/system_id1/:system_id1",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                ...customerWriteFields,
            },
            required: ["customer_group_id", "system_id1"],
        },
    },
    {
        name: "relation_customer_update_by_email",
        description: "メールアドレスをキーにコンタクト情報を更新します。⚠ データを変更します。空配列でemails/tels/badge_ids削除。",
        safety: "write",
        method: "PUT",
        path: "/customer_groups/:customer_group_id/customers/email/:email",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                email: s("メールアドレス（キー）"),
                ...customerWriteFields,
            },
            required: ["customer_group_id", "email"],
        },
    },
    {
        name: "relation_customer_get_by_system_id",
        description: "外部システムIDを指定してコンタクト情報を取得します。",
        safety: "read",
        method: "GET",
        path: "/customer_groups/:customer_group_id/customers/system_id1/:system_id1",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                system_id1: s("外部システムID"),
            },
            required: ["customer_group_id", "system_id1"],
        },
    },
    {
        name: "relation_customer_get_by_email",
        description: "メールアドレスを指定してコンタクト情報を取得します。",
        safety: "read",
        method: "GET",
        path: "/customer_groups/:customer_group_id/customers/email/:email",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                email: s("メールアドレス"),
            },
            required: ["customer_group_id", "email"],
        },
    },
    {
        name: "relation_customer_delete_by_system_id",
        description: "外部システムIDを指定してコンタクトを削除します。⚠⚠ 破壊的操作です。削除は取り消せません。実行前に必ずユーザーに確認してください。",
        safety: "dangerous",
        method: "DELETE",
        path: "/customer_groups/:customer_group_id/customers/system_id1/:system_id1",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                system_id1: s("外部システムID"),
            },
            required: ["customer_group_id", "system_id1"],
        },
    },
    {
        name: "relation_customer_delete_by_email",
        description: "メールアドレスを指定してコンタクトを削除します。⚠⚠ 破壊的操作です。削除は取り消せません。実行前に必ずユーザーに確認してください。",
        safety: "dangerous",
        method: "DELETE",
        path: "/customer_groups/:customer_group_id/customers/email/:email",
        inputSchema: {
            type: "object",
            properties: {
                ...cgId,
                email: s("メールアドレス"),
            },
            required: ["customer_group_id", "email"],
        },
    },
    // ===== 2. Customer Group (1) =====
    {
        name: "relation_customer_group_list",
        description: "Re:lation のアドレス帳一覧を取得します。",
        safety: "read",
        method: "GET",
        path: "/customer_groups",
        inputSchema: { type: "object", properties: {} },
    },
    // ===== 3. Ticket (4) =====
    {
        name: "relation_ticket_search",
        description: "チケットを検索します。ステータス、ラベル、担当者、チャネル種別、日時範囲等で絞り込みが可能です。per_page最大50。",
        safety: "read",
        method: "POST",
        path: "/:message_box_id/tickets/search",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                ticket_ids: ia("チケットID配列で絞り込み"),
                label_ids: ia("ラベルID配列で絞り込み"),
                status_cds: sa("ステータスコード配列（open/ongoing/closed/unwanted/trash/spam）"),
                color_cds: sa("色コード配列（red/orange/yellow/blue/pink）"),
                assignee: s("担当者メンション名で絞り込み"),
                message_ids: ia("メッセージID配列で絞り込み"),
                has_attachments: b("添付ファイルありで絞り込み"),
                method_cds: sa("チャネル種別配列（mail/tweet/twitter_dm/record/line/chatplus/r_messe/yahoo/sms/call）"),
                action_cds: sa("アクション種別配列（received/sent/draft/requested/approved/rejected/sending/scheduled/send_error/conversation/end_conversation）"),
                pending_reason_ids: ia("保留理由ID配列で絞り込み"),
                since: s("この日時以降（ISO 8601）"),
                until: s("この日時以前（ISO 8601）"),
                date: s("指定日（ISO 8601）"),
                within: s("期間指定（例: 1days, 3months）"),
                ...pageProps,
            },
            required: ["message_box_id"],
        },
    },
    {
        name: "relation_ticket_get",
        description: "チケットの詳細情報を取得します。コメント・添付ファイル情報を含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/tickets/:ticket_id",
        inputSchema: {
            type: "object",
            properties: { ...mbId, ticket_id: i("チケットID") },
            required: ["message_box_id", "ticket_id"],
        },
    },
    {
        name: "relation_record_create",
        description: "応対メモ（電話・訪問・郵送等の記録）を作成します。⚠ データを作成します。実行前に内容を確認してください。",
        safety: "write",
        method: "POST",
        path: "/:message_box_id/records",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                ticket_id: i("既存チケットID（省略時は新規チケット作成）"),
                subject: s("件名（必須）"),
                status_cd: s("ステータスコード（デフォルト: closed）（open/ongoing/closed/unwanted/trash/spam）"),
                operated_at: s("操作日時（ISO 8601形式、必須）"),
                operator: s("操作者名"),
                duration: i("対応時間（分、0〜1440、必須）"),
                body: s("本文（必須）"),
                customer_email: s("顧客メールアドレス"),
                customer_tel: s("顧客電話番号"),
                icon_cd: s("アイコン（デフォルト: received_phone）（received_phone/called_phone/meeting/sales/postal/note）"),
                is_html: b("HTML形式か（デフォルト: false）"),
                assignee: s("担当者メンション名"),
            },
            required: ["message_box_id", "subject", "operated_at", "duration", "body"],
        },
    },
    {
        name: "relation_ticket_update",
        description: "チケットのステータス・担当者・ラベル・色・分類等を更新します。⚠ データを変更します。",
        safety: "write",
        method: "PUT",
        path: "/:message_box_id/tickets/:ticket_id",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                ticket_id: i("チケットID"),
                status_cd: s("ステータスコード（open/ongoing/closed/unwanted/trash/spam）"),
                pending_reason_id: i("保留理由ID"),
                snooze_term: s("スヌーズ期間（no_term/today/tomorrow/weekend/next_monday/next_week/next_month/after_month）"),
                snooze_time: s("スヌーズ復帰日時（ISO 8601）"),
                snooze_comment: s("スヌーズコメント（最大1000文字）"),
                notification_mention_name: s("スヌーズ復帰時に通知するユーザーのメンション名"),
                label_ids: ia("ラベルID配列"),
                assignee: s("担当者メンション名"),
                approval_required: b("承認リクエストフラグ（デフォルト: false）"),
                assign_comment: s("アサインコメント（最大1000文字）"),
                color_cd: s("色コード（red/orange/yellow/blue/pink）"),
                case_category_ids: ia("チケット分類ID配列"),
            },
            required: ["message_box_id", "ticket_id"],
        },
    },
    // ===== 4. Chat (4) =====
    {
        name: "relation_chat_chatplus",
        description: "ChatPlusの会話履歴を取得します。account, account_key, conversations情報を含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/tickets/:ticket_id/messages/:message_id/chatplus",
        inputSchema: {
            type: "object",
            properties: chatProps,
            required: chatRequired,
        },
    },
    {
        name: "relation_chat_yahoo",
        description: "Yahoo!ショッピングの会話履歴を取得します。注文ID・商品情報を含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/tickets/:ticket_id/messages/:message_id/yahoo",
        inputSchema: {
            type: "object",
            properties: chatProps,
            required: chatRequired,
        },
    },
    {
        name: "relation_chat_rmesse",
        description: "R-Messe（楽天）の会話履歴を取得します。注文番号・商品情報・ソーシャルギフト種別を含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/tickets/:ticket_id/messages/:message_id/r_messe",
        inputSchema: {
            type: "object",
            properties: chatProps,
            required: chatRequired,
        },
    },
    {
        name: "relation_chat_line",
        description: "LINEの会話履歴を取得します。channel_id, group_name, auto_send情報を含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/tickets/:ticket_id/messages/:message_id/line",
        inputSchema: {
            type: "object",
            properties: chatProps,
            required: chatRequired,
        },
    },
    // ===== 5. Message Box (1) =====
    {
        name: "relation_message_box_list",
        description: "Re:lation の受信箱一覧を取得します。",
        safety: "read",
        method: "GET",
        path: "/message_boxes",
        inputSchema: { type: "object", properties: {} },
    },
    // ===== 6. Pending Reason (1) =====
    {
        name: "relation_pending_reason_list",
        description: "受信箱の保留理由一覧を取得します。スヌーズ復帰日時のコード体系も参照できます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/pending_reasons",
        inputSchema: {
            type: "object",
            properties: mbId,
            required: ["message_box_id"],
        },
    },
    // ===== 7. User (1) =====
    {
        name: "relation_user_list",
        description: "ユーザー一覧を取得します。メールアドレス、管理者フラグ、多要素認証、最終アクセス日時を含みます。",
        safety: "read",
        method: "GET",
        path: "/users",
        inputSchema: {
            type: "object",
            properties: pageProps,
        },
    },
    // ===== 8. Case Category (3) =====
    {
        name: "relation_case_category_list",
        description: "チケット分類の一覧を取得します。階層構造（親>子>孫）。per_page最大100。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/case_categories",
        inputSchema: {
            type: "object",
            properties: { ...mbId, ...pageProps },
            required: ["message_box_id"],
        },
    },
    {
        name: "relation_case_category_create",
        description: "チケット分類を新規登録します。⚠ マスタデータを変更します。実行前に確認してください。",
        safety: "master",
        method: "POST",
        path: "/:message_box_id/case_categories",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                name: s("分類名（必須、255文字以下）"),
                parent_id: i("親分類ID（省略時はルートに作成。アーカイブ済みは指定不可）"),
            },
            required: ["message_box_id", "name"],
        },
    },
    {
        name: "relation_case_category_update",
        description: "チケット分類を更新・アーカイブします。⚠ マスタデータを変更します。204 No Content。",
        safety: "master",
        method: "PUT",
        path: "/:message_box_id/case_categories/:case_category_id",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                case_category_id: i("チケット分類ID"),
                name: s("分類名（255文字以下）"),
                parent_id: i("親分類ID（nullで親なしに変更）"),
                archived: b("アーカイブフラグ"),
            },
            required: ["message_box_id", "case_category_id"],
        },
    },
    // ===== 9. Label (3) =====
    {
        name: "relation_label_list",
        description: "受信箱のラベル一覧を取得します。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/labels",
        inputSchema: {
            type: "object",
            properties: { ...mbId, ...pageProps },
            required: ["message_box_id"],
        },
    },
    {
        name: "relation_label_create",
        description: "ラベルを新規登録します。⚠ マスタデータを変更します。実行前に確認してください。",
        safety: "master",
        method: "POST",
        path: "/:message_box_id/labels",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                name: s("ラベル名（必須、255文字以下）"),
                color: s("ラベルの色（必須）（gray/brown/red/orange/green/blue/purple + _01〜_04）"),
                parent_id: i("親ラベルID"),
            },
            required: ["message_box_id", "name", "color"],
        },
    },
    {
        name: "relation_label_update",
        description: "ラベルを更新します。⚠ マスタデータを変更します。実行前に確認してください。",
        safety: "master",
        method: "PUT",
        path: "/:message_box_id/labels/:label_id",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                label_id: i("ラベルID"),
                name: s("ラベル名"),
                color: s("ラベルの色"),
                parent_id: i("親ラベルID（nullで親なしに変更）"),
            },
            required: ["message_box_id", "label_id"],
        },
    },
    // ===== 10. Badge (1) =====
    {
        name: "relation_badge_list",
        description: "アドレス帳のバッジ一覧を取得します。",
        safety: "read",
        method: "GET",
        path: "/customer_groups/:customer_group_id/badges",
        inputSchema: {
            type: "object",
            properties: { ...cgId, ...pageProps },
            required: ["customer_group_id"],
        },
    },
    // ===== 11. Mail Account (1) =====
    {
        name: "relation_mail_account_list",
        description: "受信箱の送信メール設定一覧を取得します。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/mail_accounts",
        inputSchema: {
            type: "object",
            properties: { ...mbId, ...pageProps },
            required: ["message_box_id"],
        },
    },
    // ===== 12. Mail (3) =====
    {
        name: "relation_mail_send",
        description: "新規チケットを作成しメールを送信します。⚠⚠ 実際にメールが送信されます。実行前に必ずユーザーに確認してください。",
        safety: "dangerous",
        method: "POST",
        path: "/:message_box_id/mails",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                status_cd: s("ステータスコード（必須）（open/ongoing/closed/unwanted/trash/spam）"),
                ...mailFields,
            },
            required: [
                "message_box_id",
                "status_cd",
                "mail_account_id",
                "to",
                "subject",
                "body",
                "is_html",
            ],
        },
    },
    {
        name: "relation_mail_reply",
        description: "既存チケットのメッセージに返信します。⚠⚠ 実際にメールが送信されます。実行前に必ずユーザーに確認してください。",
        safety: "dangerous",
        method: "POST",
        path: "/:message_box_id/mails/reply",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                message_id: i("返信元メッセージID（必須）"),
                status_cd: s("ステータスコード（必須）（open/ongoing/closed/unwanted/trash/spam）"),
                ...mailFields,
            },
            required: [
                "message_box_id",
                "message_id",
                "status_cd",
                "mail_account_id",
                "to",
                "subject",
                "body",
                "is_html",
            ],
        },
    },
    {
        name: "relation_mail_draft",
        description: "メールの下書きを作成します。message_id省略で新規チケットの下書き。⚠ データを作成します。",
        safety: "write",
        method: "POST",
        path: "/:message_box_id/mails/draft",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                message_id: i("返信元メッセージID（省略時は新規チケット）"),
                status_cd: s("ステータスコード（open/ongoing/closed/unwanted/trash/spam）"),
                ...mailFields,
            },
            required: [
                "message_box_id",
                "mail_account_id",
                "to",
                "subject",
                "body",
                "is_html",
            ],
        },
    },
    // ===== 13. Template (2) =====
    {
        name: "relation_template_list",
        description: "メールテンプレートの一覧を取得します。1ページ最大30件。html_body/text_bodyを含みます。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/templates",
        inputSchema: {
            type: "object",
            properties: { ...mbId, ...pageProps },
            required: ["message_box_id"],
        },
    },
    {
        name: "relation_template_search",
        description: "テンプレートをカテゴリ名で検索します（完全一致）。per_page最大30。",
        safety: "read",
        method: "POST",
        path: "/:message_box_id/templates/search",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                template_category_name: s("テンプレートカテゴリ名（完全一致）"),
                ...pageProps,
            },
            required: ["message_box_id", "template_category_name"],
        },
    },
    // ===== 14. Comment (1) =====
    {
        name: "relation_comment_create",
        description: "メッセージにコメントを追加します（最大1000文字）。⚠ データを作成します。実行前に内容を確認してください。",
        safety: "write",
        method: "POST",
        path: "/:message_box_id/comments",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                message_id: i("メッセージID（必須）"),
                comment: s("コメント本文（最大1000文字、必須）"),
            },
            required: ["message_box_id", "message_id", "comment"],
        },
    },
    // ===== 15. Attachment (1) =====
    {
        name: "relation_attachment_url",
        description: "添付ファイルのダウンロードURL（Presigned URL）を発行します。有効期限付き。",
        safety: "read",
        method: "GET",
        path: "/:message_box_id/messages/attachments/:attachment_id",
        inputSchema: {
            type: "object",
            properties: {
                ...mbId,
                attachment_id: i("添付ファイルID"),
            },
            required: ["message_box_id", "attachment_id"],
        },
    },
];
//# sourceMappingURL=tools.js.map