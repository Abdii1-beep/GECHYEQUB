
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.SystemSettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  description: 'description',
  isSensitive: 'isSensitive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  status: 'status',
  emailVerified: 'emailVerified',
  phoneVerified: 'phoneVerified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  customerId: 'customerId',
  kycId: 'kycId',
  customerProfileId: 'customerProfileId',
  kycRecordId: 'kycRecordId'
};

exports.Prisma.CustomerProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  fullName: 'fullName',
  dateOfBirth: 'dateOfBirth',
  phone: 'phone',
  address: 'address',
  nationality: 'nationality',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KycRecordScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  fullName: 'fullName',
  dateOfBirth: 'dateOfBirth',
  phone: 'phone',
  email: 'email',
  address: 'address',
  nationalId: 'nationalId',
  idVerificationStatus: 'idVerificationStatus',
  idDocumentUrl: 'idDocumentUrl',
  verificationDate: 'verificationDate',
  verifiedBy: 'verifiedBy',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LotteryCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  systemName: 'systemName',
  status: 'status',
  ticketPrice: 'ticketPrice',
  maxTickets: 'maxTickets',
  startDate: 'startDate',
  endDate: 'endDate',
  drawDate: 'drawDate',
  eligibilityRules: 'eligibilityRules',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VehicleScalarFieldEnum = {
  id: 'id',
  make: 'make',
  model: 'model',
  year: 'year',
  color: 'color',
  engineInfo: 'engineInfo',
  transmission: 'transmission',
  fuelType: 'fuelType',
  vinChassisNumber: 'vinChassisNumber',
  registrationInfo: 'registrationInfo',
  vehicleCondition: 'vehicleCondition',
  location: 'location',
  declaredValue: 'declaredValue',
  status: 'status',
  images: 'images',
  documents: 'documents',
  campaignId: 'campaignId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lotteryCampaignId: 'lotteryCampaignId'
};

exports.Prisma.TicketScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  customerId: 'customerId',
  purchaseId: 'purchaseId',
  paymentId: 'paymentId',
  issueTimestamp: 'issueTimestamp',
  status: 'status',
  verificationHash: 'verificationHash',
  qrCodeToken: 'qrCodeToken',
  drawEligibility: 'drawEligibility',
  drawId: 'drawId',
  drawResultHash: 'drawResultHash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lotteryCampaignId: 'lotteryCampaignId'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  amount: 'amount',
  currency: 'currency',
  provider: 'provider',
  providerTxnId: 'providerTxnId',
  status: 'status',
  paymentMethod: 'paymentMethod',
  failureReason: 'failureReason',
  receiptUrl: 'receiptUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentTransactionScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  responseMetadata: 'responseMetadata',
  callbackStatus: 'callbackStatus',
  receivedAt: 'receivedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DrawScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  state: 'state',
  eligibleTicketCount: 'eligibleTicketCount',
  commitmentHash: 'commitmentHash',
  winningTicketId: 'winningTicketId',
  drawTimestamp: 'drawTimestamp',
  configuration: 'configuration',
  verificationRecord: 'verificationRecord'
};

exports.Prisma.DrawEligibleTicketScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  drawId: 'drawId',
  orderIndex: 'orderIndex',
  createdAt: 'createdAt'
};

exports.Prisma.DrawResultScalarFieldEnum = {
  id: 'id',
  drawId: 'drawId',
  drawNumber: 'drawNumber',
  drawHash: 'drawHash',
  verifiedAt: 'verifiedAt',
  verificationStatus: 'verificationStatus',
  createdAt: 'createdAt'
};

exports.Prisma.WinnerScalarFieldEnum = {
  id: 'id',
  drawId: 'drawId',
  ticketId: 'ticketId',
  customerId: 'customerId',
  verificationStatus: 'verificationStatus',
  notificationStatus: 'notificationStatus',
  claimStatus: 'claimStatus',
  verificationDocuments: 'verificationDocuments',
  verificationTimestamp: 'verificationTimestamp',
  approvalOfficer: 'approvalOfficer',
  rejectionReason: 'rejectionReason',
  deliveryStatus: 'deliveryStatus',
  deliveredAt: 'deliveredAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  amount: 'amount',
  currency: 'currency',
  reason: 'reason',
  status: 'status',
  processedAt: 'processedAt',
  processedBy: 'processedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  data: 'data',
  read: 'read',
  sentChannels: 'sentChannels',
  sentAt: 'sentAt',
  createdAt: 'createdAt'
};

exports.Prisma.FraudAlertScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  severity: 'severity',
  title: 'title',
  description: 'description',
  evidence: 'evidence',
  status: 'status',
  investigatedBy: 'investigatedBy',
  resolvedAt: 'resolvedAt',
  resolvedReason: 'resolvedReason',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  role: 'role',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  timestamp: 'timestamp',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  requestId: 'requestId',
  beforeValue: 'beforeValue',
  afterValue: 'afterValue',
  result: 'result',
  createdAt: 'createdAt',
  lotteryCampaignId: 'lotteryCampaignId',
  drawId: 'drawId'
};

exports.Prisma.SoftDeleteLogScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  reason: 'reason'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.KycStatus = exports.$Enums.KycStatus = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
};

exports.CampaignStatus = exports.$Enums.CampaignStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.TicketStatus = exports.$Enums.TicketStatus = {
  RESERVED: 'RESERVED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  WINNING: 'WINNING',
  NON_WINNING: 'NON_WINNING',
  INVALID: 'INVALID'
};

exports.PaymentProvider = exports.$Enums.PaymentProvider = {
  STRIPE: 'STRIPE',
  CBE: 'CBE',
  BIRR: 'BIRR'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED'
};

exports.DrawState = exports.$Enums.DrawState = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  LOCKED: 'LOCKED',
  DRAWING: 'DRAWING',
  COMPLETED: 'COMPLETED',
  VERIFIED: 'VERIFIED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED'
};

exports.Role = exports.$Enums.Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  LOTTERY_MANAGER: 'LOTTERY_MANAGER',
  FINANCE_OFFICER: 'FINANCE_OFFICER',
  KYC_OFFICER: 'KYC_OFFICER',
  DRAW_OFFICER: 'DRAW_OFFICER',
  AUDITOR: 'AUDITOR',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  CONTENT_MANAGER: 'CONTENT_MANAGER'
};

exports.Prisma.ModelName = {
  SystemSetting: 'SystemSetting',
  User: 'User',
  CustomerProfile: 'CustomerProfile',
  KycRecord: 'KycRecord',
  LotteryCampaign: 'LotteryCampaign',
  Vehicle: 'Vehicle',
  Ticket: 'Ticket',
  Order: 'Order',
  PaymentTransaction: 'PaymentTransaction',
  Draw: 'Draw',
  DrawEligibleTicket: 'DrawEligibleTicket',
  DrawResult: 'DrawResult',
  Winner: 'Winner',
  Refund: 'Refund',
  Notification: 'Notification',
  FraudAlert: 'FraudAlert',
  AuditLog: 'AuditLog',
  SoftDeleteLog: 'SoftDeleteLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
