const API_BASE_URL = 'https://api.bet-30.co';
const API_KEY = 'QUs6LWRTRWhUTDNvUjJIdEtsbjZrekRMMjdhdDlkWUFISnNNWi1oMTlpZ19EcURfOF9BV0ZjREZRNTk1VjdkRnA2eDhRNkxKUll3bHA3eXJLZGF3bFlwckE';
const AGENT_USERNAME = 'agentegeneral1';
const PARENT_ID = 'cm7m4640502wklh41o1nbhm1w';
const SKIN_ID = '3c5ccf8f549f';

interface CasinoApiResponse<T = any> {
  result: T;
  targetUrl: string | null;
  success: boolean;
  error: string | null;
  unAuthorizedRequest: boolean;
  __abp: boolean;
}

interface PlayerBalance {
  id: string;
  balance: number;
}

interface AgentInfo {
  userName: string;
  balance: number;
  id: string;
  rolename: string;
  currency: string;
  playersCount: number;
  email: string;
  name: string;
  surname: string;
}

interface TransactionResult {
  transactionId: string;
  status: string;
  code: string | null;
  message: string;
}

const casinoApiRequest = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  queryParams?: Record<string, string>
): Promise<CasinoApiResponse<T>> => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers: HeadersInit = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), config);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};

export const casinoApiService = {
  // Obtener balance del agente
  getAgentBalance: async (agentId: string, username: string) => {
    return casinoApiRequest<number>(
      '/api/services/app/Agent/GetAgentBalance',
      'GET',
      null,
      { agentId, username }
    );
  },

  // Obtener información del jugador/agente
  getAgentInfo: async (agentId: string) => {
    return casinoApiRequest<AgentInfo>(
      '/api/services/app/Agent/GetAgentInfo',
      'GET',
      null,
      { agentId, getParents: 'false', username: AGENT_USERNAME }
    );
  },

  // Crear nuevo jugador
  addPlayer: async (userName: string, password: string) => {
    return casinoApiRequest<{ id: string; userName: string; status: string }>(
      '/api/services/app/Players/AddPlayer',
      'POST',
      {
        userName,
        password,
        parentId: PARENT_ID,
        skinId: SKIN_ID,
      }
    );
  },

  // Realizar depósito
  doDeposit: async (userName: string, amount: number, userType: number = 1) => {
    return casinoApiRequest<TransactionResult>(
      '/api/services/app/Players/DoDeposit',
      'POST',
      {
        userName,
        userType,
        agentId: PARENT_ID,
        agentUserName: AGENT_USERNAME,
        amount,
      },
      { username: AGENT_USERNAME }
    );
  },

  // Realizar retiro
  doWithdraw: async (userName: string, amount: number, userType: number = 1) => {
    return casinoApiRequest<TransactionResult>(
      '/api/services/app/Players/DoWithdraw',
      'POST',
      {
        userName,
        userType,
        agentUserName: AGENT_USERNAME,
        amount,
      },
      { username: AGENT_USERNAME }
    );
  },

  // Cambiar contraseña
  changePassword: async (username: string, newPassword: string) => {
    return casinoApiRequest<string>(
      '/api/services/app/Agent/ChangePassword',
      'POST',
      {},
      { newPassword, username }
    );
  },

  // Obtener historial del jugador
  getPlayerHistory: async (
    userId: string,
    playerName: string,
    startTime: string,
    endTime: string,
    pageSize: number = 20,
    offset: number = 0
  ) => {
    return casinoApiRequest(
      '/api/services/app/Players/Report_HistoryPlayer',
      'POST',
      {
        userId,
        startTime,
        endTime,
        playerName,
        includeCountAndTotals: 1,
        paginationOffset: offset,
        pageSize,
      },
      { username: playerName }
    );
  },

  // Obtener transferencias de dinero
  getMoneyTransfers: async (
    startTime: string,
    endTime: string,
    userType: string = 'Agent',
    pageSize: number = 200
  ) => {
    return casinoApiRequest(
      '/api/services/app/Players/Report_MoneyTransfers',
      'POST',
      {
        StartTime: startTime,
        EndTime: endTime,
        UserType: userType,
        PlayerName: null,
        UserName: null,
        FirstLevelUsers: false,
        IncludeCountAndTotals: 1,
        AssociatedBrandId: 0,
        PaginationOffset: 0,
        PageSize: pageSize,
        OnlySuperiorTransactions: false,
        OnlyReceivedTransactions: false,
      },
      { username: AGENT_USERNAME }
    );
  },

  // Obtener balance actualizado de jugadores
  getBalances: async (playerIds: string[]) => {
    return casinoApiRequest<PlayerBalance[]>(
      '/api/services/app/Agent/GetBalances',
      'POST',
      playerIds
    );
  },

  // Obtener árbol de agentes
  getAgentTreeView: async (parentId: string) => {
    return casinoApiRequest(
      '/api/services/app/Agent/GetAgentTreeView',
      'GET',
      null,
      { parentId, username: AGENT_USERNAME }
    );
  },

  // Crear agente
  createAgentUser: async (
    userName: string,
    password: string,
    rolename: string = 'Agente',
    email: string = '',
    name: string = '',
    surname: string = '',
    language: string = 'es'
  ) => {
    return casinoApiRequest<{ id: string; userName: string; status: string }>(
      '/api/services/app/Agent/CreateAgentUser',
      'POST',
      {
        userName,
        password,
        parentId: PARENT_ID,
        skinId: [SKIN_ID],
        rolename,
        email,
        surname,
        name,
        language,
      },
      { username: AGENT_USERNAME }
    );
  },

  // Constantes para uso externo
  constants: {
    AGENT_USERNAME,
    PARENT_ID,
    SKIN_ID,
  },
};
