/**
 * Gate for the feedback page — merchant extra-setting
 * FEEDBACK_ENABLED (the submission endpoint is also gated
 * server-side).
 */
export default createSettingGate('FEEDBACK_ENABLED')
