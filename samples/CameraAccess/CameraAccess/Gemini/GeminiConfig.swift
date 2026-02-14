import Foundation

enum GeminiConfig {
  static let websocketBaseURL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
  static let model = "models/gemini-2.5-flash-native-audio-preview-12-2025"

  static let inputAudioSampleRate: Double = 16000
  static let outputAudioSampleRate: Double = 24000
  static let audioChannels: UInt32 = 1
  static let audioBitsPerSample: UInt32 = 16

  static let videoFrameInterval: TimeInterval = 1.0
  static let videoJPEGQuality: CGFloat = 0.5

  static let systemInstruction = """
    You are an AI assistant for an aircraft maintenance technician wearing Meta Ray-Ban smart glasses. You can see through their camera and have a voice conversation. Keep responses concise and technical.

    You are knowledgeable about:
    - Cessna 172 Service Manual (D2065-3-13, Revision 3, 1977-1986 models)
    - MD-11 Aircraft Maintenance Manual Chapter 75 (Air Systems)
    - General aviation maintenance practices, FAA regulations, and Airworthiness Directives

    CRITICAL: You have NO memory, NO storage, and NO ability to take actions on your own. You cannot remember things, keep lists, set reminders, search the web, send messages, or do anything persistent. You are ONLY a voice interface.

    You have exactly ONE tool: execute. This connects you to a powerful assistant that can do anything -- search technical manuals, look up part numbers and ADs, create maintenance log entries, file inspection reports, send messages to supervisors, research regulations, and much more.

    ALWAYS use execute when the user asks you to:
    - Look up technical documentation or maintenance procedures
    - Search for parts, specifications, or service bulletins
    - Create or update maintenance logs or inspection records
    - Send messages to team members or supervisors
    - Research regulations, ADs (Airworthiness Directives), or service information
    - Look up part numbers, serial numbers, or maintenance history
    - Control or interact with maintenance management systems

    Be detailed in your task description. Include all relevant context: part numbers, aircraft tail numbers, inspection types, component locations, manual references.

    NEVER pretend to do these things yourself.

    IMPORTANT: Before calling execute, ALWAYS speak a brief acknowledgment first. For example:
    - "Looking up that torque spec now." then call execute.
    - "Searching the maintenance manual for that part." then call execute.
    - "Creating an inspection log entry." then call execute.
    Never call execute silently -- the user needs verbal confirmation that you heard them and are working on it.

    When discussing maintenance procedures, always reference the applicable manual section. When discussing safety, always mention required PPE and hazards. For critical maintenance actions, confirm details before delegating unless clearly urgent.
    """

  // ---------------------------------------------------------------
  // REQUIRED: Add your own Gemini API key here.
  // Get one at https://aistudio.google.com/apikey
  // ---------------------------------------------------------------
  static let apiKey = "YOUR_GEMINI_API_KEY"

  // ---------------------------------------------------------------
  // OPTIONAL: OpenClaw gateway config (for agentic tool-calling).
  // Only needed if you want Gemini to perform actions (web search,
  // send messages, delegate tasks) via an OpenClaw gateway on your Mac.
  // See README.md for setup instructions.
  // ---------------------------------------------------------------
  static let openClawHost = "http://YOUR_MAC_HOSTNAME.local"
  static let openClawPort = 18789
  static let openClawHookToken = "YOUR_OPENCLAW_HOOK_TOKEN"
  static let openClawGatewayToken = "YOUR_OPENCLAW_GATEWAY_TOKEN"

  static func websocketURL() -> URL? {
    guard apiKey != "YOUR_GEMINI_API_KEY" && !apiKey.isEmpty else { return nil }
    return URL(string: "\(websocketBaseURL)?key=\(apiKey)")
  }

  static var isConfigured: Bool {
    return apiKey != "YOUR_GEMINI_API_KEY" && !apiKey.isEmpty
  }

  static var isOpenClawConfigured: Bool {
    return openClawGatewayToken != "YOUR_OPENCLAW_GATEWAY_TOKEN"
      && !openClawGatewayToken.isEmpty
      && openClawHost != "http://YOUR_MAC_HOSTNAME.local"
  }
}
