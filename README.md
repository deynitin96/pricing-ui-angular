# Fleet Pricing Platform — End-to-End Architecture & Business Flow

A small but realistic fleet-rental platform composed of three separate repositories:

- **Angular 20 UI** — user-facing pricing calculator
- **Fleet Service** — fleet inventory, rental orchestration, and the integration boundary for pricing
- **Pricing Service** — pricing rules and quote calculation

The repositories are intentionally separated so that fleet management and pricing logic can evolve independently while the Fleet Service coordinates the rental business flow.

## Repositories

| Component | Repository | Primary responsibility |
|---|---|---|
| Fleet Service | https://github.com/deynitin96/fleet-service-demo | Manage trucks, rentals, fleet summary, and call Pricing Service |
| Pricing Service | https://github.com/deynitin96/pricing-service-demo | Resolve pricing rules and calculate rental quotes |
| Pricing UI | https://github.com/deynitin96/pricing-ui-angular | Provide the browser UI for pricing requests and display quote results |

---

## 1. Business Problem

A truck-rental business needs to answer three questions reliably:

1. **Which trucks are in the fleet and where are they located?**
2. **Is a particular truck available for rental?**
3. **What should the customer pay for the requested rental?**

The application addresses these concerns with separate responsibilities:

```text
                    Angular 20 UI
                         |
                         | HTTP
                         v
                 +------------------+
                 |  Fleet Service   |
                 |    :8081         |
                 +---------+--------+
                           |
                           | RestTemplate
                           v
                 +------------------+
                 | Pricing Service  |
                 |    :8082         |
                 +------------------+
                           |
                           v
                     Pricing DB

                 Fleet Service
                       |
                       v
                    Fleet DB
                       |
             +---------+---------+
             |                   |
           TRUCK              RENTAL
```

This separation is useful from a business perspective because pricing rules can change frequently without requiring all fleet-management functionality to change with them.

---

# 2. High-Level Architecture

## 2.1 Frontend

The Angular application provides a **Fleet Pricing Calculator**.

The current screen lets a user select:

- Truck type
- Location
- Rental days
- Estimated miles

The UI then displays:

- Quote ID
- Base price
- Mileage charge
- Discount
- Tax
- Total price
- Currency

The Angular code uses a standalone component and Angular's dependency injection, `HttpClient`, routing, and browser/platform checks.

---

## 2.2 Fleet Service

The Fleet Service is the main operational backend.

It is responsible for:

- Creating trucks
- Retrieving all trucks
- Retrieving only available trucks
- Finding a truck by ID
- Finding trucks by location
- Returning fleet summary information
- Renting a truck
- Creating the corresponding rental record
- Calling Pricing Service when a quote is required

The service uses:

- Spring Boot 4
- Java 21
- Spring Web MVC
- MyBatis
- MySQL
- RestTemplate
- Bean Validation
- Lombok

The repository's Maven configuration confirms Java 21, Spring Boot 4.0.8, MyBatis 4.0.1, MySQL, REST client support, validation, and Lombok.

---

## 2.3 Pricing Service

Pricing Service owns the pricing rules.

It is responsible for:

1. Looking up the pricing configuration using:
   - truck type
   - location
2. Calculating base rental cost
3. Calculating mileage cost
4. Applying a percentage discount
5. Applying tax after discount
6. Returning a structured pricing response

It uses:

- Spring Boot 4
- Java 21
- Spring MVC
- MyBatis
- MySQL
- Bean Validation
- Lombok

The pricing repository intentionally keeps the business calculation in a dedicated service layer instead of mixing pricing rules into the controller.

---

# 3. Why Three Repositories?

This is a simple example of service decomposition.

```text
pricing-ui-angular
        |
        v
fleet-service-demo
        |
        v
pricing-service-demo
```

### Why not put everything in one Spring Boot application?

Because the business capabilities have different ownership:

**Fleet capability**

- Truck inventory
- Availability
- Rental state
- Fleet reporting

**Pricing capability**

- Base rates
- Mileage rates
- Discounts
- Taxes
- Currency

Separating them means a future pricing team could change pricing rules without modifying the truck-management domain.

It also provides a practical starting point for microservice-oriented development.

---

# 4. End-to-End Pricing Flow

This is the most important flow in the application.

## Step 1 — User opens the Angular application

The default route redirects to:

```text
/pricing
```

The Angular pricing component renders the Fleet Pricing Calculator.

The UI supports:

```text
Truck Type
Location
Rental Days
Estimated Miles
```

---

## Step 2 — Locations are loaded

The Angular service calls:

```http
GET /truck-api/api/v1/trucks/getAllTrucks
```

The development proxy routes this request to:

```text
http://localhost:8081/api/v1/trucks/getAllTrucks
```

The UI extracts unique truck locations from the returned fleet records.

### Why is this useful?

Instead of hard-coding every location into the production flow, the UI can derive locations from current fleet data.

Business benefit:

- Less duplicated configuration
- Lower risk of showing unavailable/unknown locations
- Easier expansion to new operating locations

There is also a fallback location list when the fleet lookup fails.

---

# 5. User Submits a Pricing Request

Example:

```json
{
  "truckType": "HEAVY_DUTY",
  "rentalDays": 3,
  "estimatedMiles": 450,
  "location": "HYDERABAD"
}
```

The Angular pricing service sends:

```http
POST /fleet-api/api/v1/quotes/calculate
```

The Angular development proxy forwards:

```text
/fleet-api
       |
       v
http://localhost:8081
```

So the actual Fleet Service endpoint is:

```http
POST http://localhost:8081/api/v1/quotes/calculate
```

---

# 6. Why Does Angular Call Fleet Instead of Pricing Directly?

This is an important architectural choice in the current implementation.

The browser does not call the Pricing Service directly.

Instead:

```text
Angular
   |
   v
Fleet Service
   |
   v
Pricing Service
```

Fleet provides an integration boundary for pricing.

### Business benefit

The frontend remains less coupled to internal pricing infrastructure.

Later, Fleet could:

- enrich the request with truck details
- apply availability rules
- add customer information
- combine pricing with fleet information
- switch the underlying pricing implementation

without changing the Angular contract.

This is similar to using a backend orchestration/facade layer.

---

# 7. Fleet Service → Pricing Service

Fleet's `PricingClient` builds the Pricing Service endpoint:

```text
/api/v1/pricing/quote
```

and performs a synchronous HTTP POST using `RestTemplate`.

The request sent to Pricing Service contains:

```text
truckType
rentalDays
estimatedMiles
location
```

The response is mapped using:

```text
APIResponse<PricingResponse>
```

The client also checks for:

- empty HTTP responses
- empty response data
- REST client failures

### Why use a dedicated PricingClient?

It keeps service-to-service communication out of the business logic.

Instead of putting HTTP code inside `RentalService`, the application has:

```text
RentalService
     |
     v
PricingClient
     |
     v
RestTemplate
     |
     v
Pricing Service
```

This improves separation of concerns and makes the integration easier to test or replace.

---

# 8. Pricing Service Processing

The Pricing Controller exposes:

```http
POST /api/v1/pricing/quote
```

The controller receives the validated request and delegates immediately to:

```text
PricingService.calculateQuote(...)
```

The controller's responsibility is therefore mainly:

- HTTP handling
- validation boundary
- response construction

The pricing rules are in the service layer.

This is a good application of the controller/service separation.

---

# 9. Pricing Rule Lookup

Pricing Service uses MyBatis to query the pricing table using:

```text
truckType
location
```

Conceptually:

```sql
SELECT
    id,
    truck_type,
    location,
    base_price,
    price_per_mile,
    discount_percentage,
    tax_percentage,
    currency
FROM pricing
WHERE truck_type = ?
  AND location = ?
LIMIT 1;
```

The code maps database column names such as:

```text
base_price
price_per_mile
discount_percentage
tax_percentage
```

to Java camel-case properties.

### Why store pricing rules in the database?

Pricing is a business configuration, not a software constant.

A database-driven approach allows authorized operations teams to change pricing values without changing Java calculation code.

Examples:

- Increase heavy-duty daily rate
- Change fuel/mileage rate
- Introduce location-based pricing
- Change a discount percentage
- Change tax percentage

---

# 10. Pricing Calculation

The current Pricing Service implements the following calculation.

## Base Price

```text
basePrice =
    configuredBasePrice × rentalDays
```

Example:

```text
Base rate = ₹1,250/day
Rental    = 3 days

Base price = 1,250 × 3
           = ₹3,750
```

---

## Mileage Charge

```text
mileageCharge =
    pricePerMile × estimatedMiles
```

Example:

```text
Price per mile = ₹3
Estimated miles = 450

Mileage charge = 3 × 450
               = ₹1,350
```

---

## Subtotal

```text
subtotal =
    basePrice + mileageCharge
```

---

## Discount

```text
discount =
    subtotal × discountPercentage / 100
```

The implementation rounds the percentage calculation to two decimal places using `HALF_UP`.

This is important for monetary calculations because floating-point arithmetic should not be used for currency decisions.

The application correctly uses `BigDecimal` for the pricing service's monetary values.

---

## Discounted Amount

```text
discountedAmount =
    subtotal - discount
```

---

## Tax

Tax is calculated on the discounted amount:

```text
tax =
    discountedAmount × taxPercentage / 100
```

---

## Final Price

```text
totalPrice =
    discountedAmount + tax
```

The returned response contains:

```json
{
  "quoteId": 3,
  "basePrice": 3750.00,
  "mileageCharge": 1350.00,
  "discount": 255.00,
  "tax": 873.00,
  "totalPrice": 5718.00,
  "currency": "USD"
}
```

The exact values depend on the pricing configuration stored in the database.

---

# 11. Why Separate Base Price, Mileage, Discount and Tax?

Returning only:

```text
totalPrice
```

would be insufficient for a rental business.

Returning a price breakdown supports:

- customer transparency
- invoice generation
- support investigations
- pricing audits
- reconciliation
- dispute resolution

For example, customer support can answer:

> "Why is my quote higher than the daily rental rate?"

because the system can show the mileage charge and tax separately.

---

# 12. Validation

Both backend services use Jakarta Bean Validation.

Examples include:

### Pricing Request

```text
truckType     → required
rentalDays    → minimum 1
estimatedMiles → zero or greater
location      → required
```

### Truck Request

```text
truckNumber       → required
truckType         → required
status            → required
location          → required
mileage           → zero or greater
model             → required
manufacturingYear → minimum 2000
```

### Rental Request

```text
customerName       → required
expectedReturnDate → required and future
estimatedMiles     → zero or greater
```

### Why validation matters

Validation protects the business rules at the API boundary.

Without it, the system could accept:

```text
rentalDays = -10
estimatedMiles = -500
location = ""
customerName = ""
```

which could produce invalid pricing or corrupted operational data.

---

# 13. Standard API Response

The services commonly use:

```json
{
  "message": "Some business message",
  "statusCode": 200,
  "data": {}
}
```

This gives consumers a predictable wrapper.

For example:

```json
{
  "message": "Pricing calculated successfully",
  "statusCode": 200,
  "data": {
    "quoteId": 3,
    "basePrice": 3750.00,
    "mileageCharge": 1350.00,
    "discount": 255.00,
    "tax": 873.00,
    "totalPrice": 5718.00,
    "currency": "USD"
  }
}
```

A consistent contract makes frontend integration simpler.

---

# 14. Fleet Management Flow

Fleet Service exposes several truck-management APIs.

## Add Truck

```http
POST /api/v1/trucks/addTruck
```

The controller:

1. Validates the request
2. Converts the DTO to a domain entity
3. Calls the MyBatis mapper
4. Returns the generated ID and truck information

The code uses a dedicated:

```text
TruckDtoMapper
```

to convert:

```text
TruckRequest → Truck
Truck → TruckResponse
```

### Why?

It avoids mixing mapping logic with the business service.

It also keeps API DTOs separate from persistence/domain models.

---

# 15. Retrieve Fleet Data

### All Trucks

```http
GET /api/v1/trucks/getAllTrucks
```

### Available Trucks

```http
GET /api/v1/trucks/getAvailableTrucks
```

The available-truck API specifically filters:

```text
status = AVAILABLE
```

### Business value

An availability query is fundamental for rental operations.

It prevents customer/service users from having to manually inspect all fleet records.

---

# 16. Search Trucks by Location

```http
GET /api/v1/trucks/getTruckByLocation?location=HYDERABAD
```

The service queries the database directly through MyBatis.

### Business value

Fleet businesses are location-sensitive.

Knowing what is available in:

```text
Hyderabad
Pune
Bangalore
Chennai
```

helps with:

- customer fulfillment
- vehicle allocation
- relocation planning
- operational utilization

---

# 17. Fleet Summary

The Fleet Service exposes:

```http
GET /api/v1/trucks/getFleetSummary
```

The implementation invokes a database stored procedure:

```text
get_fleet_summary()
```

The procedure returns:

```text
totalTrucks
availableTrucks
rentedTrucks
maintenanceTrucks
```

### Why a stored procedure?

This is useful for demonstrating an enterprise/database-centric reporting pattern.

A summary query is often:

- read-heavy
- reusable
- stable
- suitable for database-side execution

It also provides a good example of how MyBatis can call stored procedures.

---

# 18. Truck Rental Flow

There are two rental-related entry points in the Fleet Service:

```text
POST /api/v1/trucks/rentTruck/{id}
```

and the richer rental endpoint:

```text
POST /api/v1/rentals/rentTruck/{id}
```

The second endpoint represents the full rental business flow.

---

# 19. Complete Rental Transaction

The full rental workflow inside `RentalService` is:

```text
Customer
   |
   v
RentalController
   |
   v
RentalService
   |
   +---- 1. Read truck
   |
   +---- 2. Calculate rental days
   |
   +---- 3. Call Pricing Service
   |
   +---- 4. Execute rent_truck stored procedure
   |
   +---- 5. Interpret result code
   |
   +---- 6. Create RENTAL record
   |
   +---- 7. Return rental + pricing
```

This is the core business orchestration in the current application.

---

# 20. Step 1 — Read Truck Information

The service first finds the truck.

It needs:

```text
truckType
location
```

because these values are required by Pricing Service.

It also verifies that the truck exists.

If not:

```text
TruckNotFoundException
```

is raised.

### Business reason

You should never attempt to create a rental for an unknown fleet asset.

---

# 21. Step 2 — Determine Rental Days

The service calculates hours between:

```text
rentalStartDate = now
expectedReturnDate = request date
```

Then it rounds partial days upward.

Example:

```text
25 hours
   ↓
2 rental days
```

This matters in vehicle rental because charging logic often operates on rental-day units rather than raw hours.

---

# 22. Step 3 — Call Pricing Service

Fleet creates:

```text
PricingRequest
```

using:

```text
truck.getTruckType()
rentalDays
estimatedMiles
truck.getLocation()
```

The pricing engine therefore gets authoritative fleet information rather than relying on the browser to provide the truck type/location independently.

This reduces the risk of pricing a truck using inconsistent inventory information.

---

# 23. Step 4 — Rent Truck Stored Procedure

The service calls:

```text
rent_truck(...)
```

through MyBatis as a callable stored procedure.

The procedure returns a result code through an OUT parameter.

The Java code interprets:

```text
0 → success
1 → truck not found
2 → truck not available
other → unexpected failure
```

The exact SQL definition of `rent_truck` is not stored in the repository, so its database implementation must be provisioned separately.

### Why use a stored procedure here?

Truck rental changes operational state:

```text
AVAILABLE
     ↓
  RENTED
```

Putting the state transition in a database routine can centralize the critical update logic close to the data.

For a production system, the procedure should ensure the update is atomic and safe under concurrent requests.

---

# 24. Concurrency and Double-Rental Prevention

This part is especially important from a business perspective.

Imagine:

```text
Customer A ──┐
             ├── Truck 101
Customer B ──┘
```

Both customers try to rent the same truck simultaneously.

The business rule is:

```text
One physical truck
        =
One active rental
```

The current design moves the status transition into the `rent_truck` stored procedure and uses a result code to report whether the operation succeeded or failed.

This is a useful foundation for concurrency control because the database can decide whether the truck is still available.

For production hardening, the stored procedure should be reviewed to guarantee a single atomic transition such as:

```sql
UPDATE truck
SET status = 'RENTED'
WHERE id = ?
  AND status = 'AVAILABLE';
```

followed by checking the affected row count, or an equivalent transactional locking strategy.

---

# 25. Step 5 — Create Rental Record

Once the truck-rental operation succeeds, the service creates a `Rental` object:

```text
truckId
customerName
rentalStartDate
expectedReturnDate
status = ACTIVE
```

The record is inserted using MyBatis.

The service checks that exactly one row was affected.

### Why this check is useful

It catches data persistence failures rather than silently returning success to the caller.

---

# 26. Transaction Boundary

The complete rental operation is marked:

```java
@Transactional
```

This communicates the intent that the database changes belong to one business transaction.

The important idea is:

```text
Truck state update
        +
Rental record creation
```

should not result in a misleading state where the application claims a successful rental but failed to persist the rental record.

### Important distributed-system limitation

The external Pricing Service call is an HTTP call and is not part of the same database transaction.

Therefore:

```text
DB transaction
    ≠
HTTP transaction
```

This is normal in a distributed system.

For a larger production system, compensation, reservation, or saga-style patterns may be preferable for workflows spanning multiple services.

---

# 27. Final Rental Response

On success, the Fleet Service returns both:

```text
Rental information
+
Pricing information
```

This is valuable because the customer/consumer gets a single business response instead of calling two APIs independently.

Conceptually:

```json
{
  "message": "Truck rented successfully",
  "statusCode": 201,
  "data": {
    "rentalId": 10,
    "truckId": 1,
    "customerName": "John",
    "rentalStartDate": "...",
    "expectedReturnDate": "...",
    "status": "ACTIVE",
    "pricing": {
      "quoteId": 3,
      "basePrice": 3750.00,
      "mileageCharge": 1350.00,
      "discount": 255.00,
      "tax": 873.00,
      "totalPrice": 5718.00,
      "currency": "USD"
    }
  }
}
```

This gives the caller a complete business outcome.

---

# 28. Error Handling

## Fleet Service

`GlobalExceptionHandler` handles:

- `TruckNotFoundException` → `404 NOT FOUND`
- `TruckRentalException` → `409 CONFLICT`
- `PricingServiceException` → `502 BAD GATEWAY`
- unexpected exceptions → `500 INTERNAL SERVER ERROR`

### Why 409 for an unavailable truck?

A truck that exists but cannot currently be rented is a business state conflict rather than a missing resource.

Example:

```text
Truck exists
      +
Status = RENTED
      ↓
409 CONFLICT
```

That is semantically better than returning `404`.

---

# 29. Why 502 for Pricing Service Failure?

The Fleet Service depends on another backend service.

If Pricing Service is unavailable, Fleet is acting as a gateway/orchestrator and cannot complete the business operation.

Returning:

```text
502 BAD GATEWAY
```

communicates that the downstream service interaction failed.

The Fleet `PricingClient` wraps REST client failures in `PricingServiceException`.

---

# 30. Frontend Error Handling

The Angular component clears the previous quote before starting a new calculation.

On error it extracts:

```text
error.error?.message
```

and displays the message in a danger alert.

### Business value

Users get feedback instead of seeing stale pricing results after a failed request.

---

# 31. Angular Development Proxy

The UI contains:

```text
proxy.conf.json
```

with proxy prefixes such as:

```text
/fleet-api
/truck-api
/pricing-api
```

They target:

```text
Fleet Service  → http://localhost:8081
Pricing Service → http://localhost:8082
```

The Angular start command uses:

```bash
ng serve --proxy-config proxy.conf.json
```

### Why use a proxy?

During development, the browser talks to the Angular development server while Angular CLI forwards API calls.

This simplifies local development and avoids unnecessary cross-origin complexity.

---

# 32. Angular 20 Structure

The Angular application uses:

```text
src/app/
├── models/
│   └── pricing.model.ts
├── pricing/
│   ├── pricing.ts
│   ├── pricing.html
│   └── pricing.css
├── services/
│   ├── pricing.services.ts
│   └── pricing.spec.ts
├── app.config.ts
├── app.routes.ts
└── app.html
```

The project currently uses Angular 20.3.x and TypeScript 5.9.x.

---

# 33. Why TypeScript Interfaces?

The frontend defines:

```text
PricingRequest
PricingResponse
Truck
ApiResponse<T>
```

This creates a typed contract between UI code and HTTP responses.

For example:

```ts
ApiResponse<PricingResponse>
```

makes the expected API structure explicit.

### Business/engineering benefit

Typed API models reduce:

- accidental property-name mistakes
- incorrect assumptions about response structure
- maintenance effort as the API evolves

---

# 34. MyBatis Design

Both backend services use MyBatis rather than JPA/Hibernate.

### Pricing Service

The Pricing Mapper uses annotation-based SQL.

### Fleet Service

The Truck Mapper also uses annotation-based SQL and stored procedure calls.

Examples include:

```text
@Select
@Insert
@Options
```

### Why MyBatis?

MyBatis is useful when:

- SQL control matters
- database queries are complex
- stored procedures are involved
- teams want SQL to remain explicit
- database-centric applications are common

This is particularly relevant in many enterprise systems that have existing SQL and database procedures.

---

# 35. DTO vs Entity Separation

The application separates API models and persistence models.

For example:

```text
TruckRequest
     ↓
Truck
     ↓
TruckResponse
```

This is preferable to exposing database entities directly through REST endpoints.

### Business value

It creates an API boundary.

A future database change does not necessarily have to change the public API.

For example:

```text
manufacturing_year
```

could change internally while keeping:

```text
manufacturingYear
```

as the API contract.

---

# 36. Database Model

The Fleet repository documents a MySQL `fleet_db` containing a `truck` table with fields including:

```text
id
truck_number
truck_type
status
location
mileage
model
manufacturing_year
created_at
updated_at
```

The repository also contains example fleet data for multiple locations and truck types.

The Rental entity contains:

```text
id
truckId
customerName
rentalStartDate
expectedReturnDate
actualReturnDate
status
createdAt
```

The rental table definition itself is not included in the current README, so the database schema should be maintained as a version-controlled migration in a future iteration.

---

# 37. Business State Model

The key fleet state lifecycle is:

```text
AVAILABLE
   |
   | rent
   v
RENTED
   |
   | return
   v
AVAILABLE
```

Maintenance introduces another operational state:

```text
AVAILABLE ──> MAINTENANCE
MAINTENANCE ──> AVAILABLE
```

The current repository already exposes:

```text
AVAILABLE
RENTED
MAINTENANCE
```

in its sample fleet data and summary logic.

### Why explicit states?

A fleet system needs more than a simple yes/no availability flag.

The state represents operational truth.

For example:

```text
RENTED
```

means customer possession,

while:

```text
MAINTENANCE
```

means the truck should not be offered for rental.

---

# 38. Business Scenario Example

Suppose the fleet contains:

```text
TRK-1001
Type: HEAVY_DUTY
Location: HYDERABAD
Status: AVAILABLE
```

A customer wants:

```text
3 days
450 miles
```

The end-to-end flow is:

```text
1. Customer opens Angular UI
            |
2. Selects HEAVY_DUTY
            |
3. Selects HYDERABAD
            |
4. Enters 3 rental days
            |
5. Enters 450 estimated miles
            |
6. Angular calls Fleet Service
            |
7. Fleet prepares pricing request
            |
8. Fleet calls Pricing Service
            |
9. Pricing Service loads rate for
   HEAVY_DUTY + HYDERABAD
            |
10. Pricing Service calculates:
      - base price
      - mileage charge
      - discount
      - tax
      - total
            |
11. Pricing response returns to Fleet
            |
12. Fleet returns response to Angular
            |
13. Angular displays quote breakdown
```

For an actual rental:

```text
Customer
   |
   v
POST /rentals/rentTruck/{id}
   |
   v
Validate rental request
   |
   v
Load truck
   |
   v
Calculate rental days
   |
   v
Get quote
   |
   v
rent_truck stored procedure
   |
   +---- unavailable → 409
   |
   +---- success
          |
          v
     Create rental record
          |
          v
     Return rental + quote
```

---

# 39. Why This Architecture Is Useful in a Real Business

## Separation of pricing policy

Pricing logic is independently maintained.

Business teams can change rates without changing fleet-management workflows.

## Centralized fleet state

Truck availability is owned by Fleet Service.

The UI does not become the source of truth for whether a vehicle can be rented.

## Strong API boundaries

DTOs make the API contracts explicit.

## Validation at the boundary

Bad input is rejected before it reaches business logic.

## Database-controlled operational transitions

Stored procedures can centralize critical database-side rules such as fleet summaries and rental status changes.

## Reusable pricing service

Other clients could use Pricing Service:

```text
Mobile App
Partner Portal
Internal Operations UI
Public Website
```

without duplicating price calculations.

## Transparent pricing

The quote exposes a detailed breakdown rather than hiding all pricing in one total.

## Consistent error semantics

Errors such as:

```text
404
409
502
500
```

communicate different failure classes to API consumers.

---

# 40. Current Repository Strengths

The three repositories already demonstrate several useful enterprise concepts:

- Java 21
- Spring Boot 4
- MyBatis
- REST APIs
- DTO/entity separation
- Bean Validation
- centralized exception handling
- stored procedure invocation
- synchronous service-to-service communication
- transactional rental orchestration
- database-backed pricing rules
- Angular 20 frontend
- typed TypeScript API models
- Angular development proxy
- server/browser platform handling
- basic automated test scaffolding
- clear separation between fleet and pricing responsibilities

---

# 41. Important Observations and Improvement Areas

The README describes the current code honestly; the following items are recommended before treating the platform as production-ready.

## 41.1 Secrets should not be committed

The current repositories contain database credentials in application configuration.

For production:

```text
Do not commit passwords
```

Use:

- environment variables
- Spring profiles
- Docker/Kubernetes Secrets
- Vault
- AWS Secrets Manager
- Azure Key Vault
- OpenShift/Kubernetes secrets

Any credential that has already been pushed to a public repository should be rotated.

---

## 41.2 Pricing API and Fleet API naming can be simplified

The application currently exposes both direct pricing and Fleet-mediated quote paths.

A production API strategy should define one clear external contract, for example:

```text
POST /api/v1/quotes
```

and hide internal service-to-service URLs from external clients.

---

## 41.3 The `pricing-api` Angular proxy is currently not the main flow

The Angular proxy contains a direct Pricing Service target, but the current Angular service uses:

```text
/fleet-api/api/v1/quotes
```

for quote calculation.

That means the actual browser flow is:

```text
Angular
   ↓
Fleet
   ↓
Pricing
```

This is worth keeping documented because it is easy for a new developer to misunderstand the architecture.

---

## 41.4 Add database migrations

Current database setup relies heavily on manually created schema/procedures.

A stronger implementation would use:

```text
Flyway
```

or:

```text
Liquibase
```

for:

- table creation
- indexes
- stored procedures
- initial data
- schema versioning

This makes environments repeatable.

---

## 41.5 Add service-to-service timeouts

`RestTemplate` is configured as a plain bean in the current repository.

The code contains a commented-out timeout configuration.

For production, configure:

```text
connect timeout
read timeout
```

and preferably add:

```text
retry policy
circuit breaker
bulkhead
```

where appropriate.

Otherwise a slow Pricing Service can tie up Fleet request threads.

---

## 41.6 Add observability

The next step should include:

```text
Micrometer
Actuator
structured logging
distributed tracing
```

Useful identifiers include:

```text
correlationId
quoteId
truckId
rentalId
```

This makes it much easier to trace:

```text
Angular request
      ↓
Fleet request
      ↓
Pricing request
      ↓
DB operation
```

---

## 41.7 Improve monetary type consistency

The Pricing Service correctly uses `BigDecimal`.

The Angular model uses JavaScript `number`, which is normal for display, but the system should be careful around:

- formatting
- rounding
- currency precision
- serialization

For financial-grade systems, rounding rules should be explicitly documented.

---

## 41.8 Clarify rental API responsibilities

There are two truck-rental endpoints:

```text
/api/v1/trucks/rentTruck/{id}

/api/v1/rentals/rentTruck/{id}
```

The richer rental endpoint carries customer and return-date information and is the more complete business flow.

A future API cleanup could make the responsibilities unambiguous and avoid overlapping operations.

---

## 41.9 Version stored procedure source

The `rent_truck` procedure is invoked by the application but its SQL definition is not currently included in the repository.

Store the procedure definition in version-controlled database migrations.

That ensures application code and database behavior evolve together.

---

# 42. Recommended Production-Style Target Architecture

The next evolution could look like:

```text
                         Internet
                            |
                            v
                     API Gateway / BFF
                            |
                +-----------+-----------+
                |                       |
                v                       v
        Fleet Service             Pricing Service
             |                         |
             v                         v
          Fleet DB                 Pricing DB
             |
             v
         Rental Data

Supporting platform:
--------------------------------------------
Auth / OAuth2 / JWT
Service discovery or DNS
Config management
Centralized logging
Metrics
Distributed tracing
CI/CD
Docker
Kubernetes / OpenShift
Secrets management
Flyway/Liquibase
Resilience4j
```

---

# 43. Recommended CI/CD Pipeline

A realistic deployment pipeline could be:

```text
Developer
   |
   v
Git Push
   |
   v
GitHub
   |
   v
Build
   |
   +--> Unit Tests
   |
   +--> Static Analysis
   |
   +--> Security Scan
   |
   +--> Package
   |
   v
Docker Image
   |
   v
Container Registry
   |
   v
Deploy
   |
   v
Kubernetes / OpenShift
```

For the three repositories, CI/CD should build independently:

```text
pricing-service-demo
fleet-service-demo
pricing-ui-angular
```

---

# 44. Suggested Local Run Order

Because the services depend on one another, the simplest local sequence is:

## 1. Start MySQL

Create:

```text
fleet_db
pricing_db
```

and provision the required tables and stored procedures.

## 2. Start Pricing Service

```bash
./mvnw spring-boot:run
```

Expected:

```text
http://localhost:8082
```

## 3. Start Fleet Service

```bash
./mvnw spring-boot:run
```

Expected:

```text
http://localhost:8081
```

## 4. Start Angular

```bash
npm install
npm start
```

Expected:

```text
http://localhost:4200
```

Because `npm start` uses the proxy configuration, the UI can call Fleet using:

```text
/fleet-api/...
```

---

# 45. API Quick Reference

## Pricing Service

```http
POST http://localhost:8082/api/v1/pricing/quote
```

Example:

```json
{
  "truckType": "HEAVY_DUTY",
  "rentalDays": 3,
  "estimatedMiles": 450,
  "location": "HYDERABAD"
}
```

---

## Fleet Service

### Add Truck

```http
POST http://localhost:8081/api/v1/trucks/addTruck
```

### All Trucks

```http
GET http://localhost:8081/api/v1/trucks/getAllTrucks
```

### Available Trucks

```http
GET http://localhost:8081/api/v1/trucks/getAvailableTrucks
```

### Truck by ID

```http
GET http://localhost:8081/api/v1/trucks/getTruckById/{id}
```

### Trucks by Location

```http
GET http://localhost:8081/api/v1/trucks/getTruckByLocation?location=HYDERABAD
```

### Fleet Summary

```http
GET http://localhost:8081/api/v1/trucks/getFleetSummary
```

### Simple Truck Rental

```http
POST http://localhost:8081/api/v1/trucks/rentTruck/{id}
```

### Full Rental Flow

```http
POST http://localhost:8081/api/v1/rentals/rentTruck/{id}
```

### Fleet-Mediated Quote

```http
POST http://localhost:8081/api/v1/quotes/calculate
```

---

# 46. Technologies

| Layer | Technology |
|---|---|
| Frontend | Angular 20 |
| Language | TypeScript |
| Backend | Java 21 |
| Framework | Spring Boot 4 |
| Web | Spring MVC |
| Persistence | MyBatis |
| Database | MySQL |
| HTTP client | RestTemplate |
| Validation | Jakarta Bean Validation |
| Build | Maven / Angular CLI |
| Styling | HTML/CSS with Bootstrap-oriented classes |
| Testing | JUnit/Spring/Angular testing scaffolding |

---

# 47. Repository-Level Architecture

## Pricing Service

```text
controller
   |
   v
service
   |
   v
mapper
   |
   v
MySQL
```

## Fleet Service

```text
controller
   |
   v
service
   |
   +------> mapper ------> Fleet DB
   |
   +------> PricingClient
                 |
                 v
          Pricing Service
```

## Angular UI

```text
Component
   |
   v
PricingService
   |
   v
HttpClient
   |
   v
Angular Dev Proxy
   |
   v
Fleet Service
```

---

# 48. Overall Business Value

The application demonstrates how a fleet-rental organization can separate and coordinate:

```text
Fleet Inventory
      +
Availability
      +
Rental State
      +
Pricing Rules
      +
Customer Quote
```

The most important business outcome is not simply "calculate a price."

It is the ability to create a reliable flow from:

```text
What vehicle do we have?
        ↓
Where is it?
        ↓
Can it be rented?
        ↓
How much will it cost?
        ↓
Can we safely create the rental?
        ↓
What did the customer receive?
```

That is the foundation of a real fleet-rental domain.

---

# 49. Interview / Architecture Explanation

A concise way to explain the project in an interview is:

> "I built a fleet-rental platform using Angular 20 and Spring Boot services. Fleet Service owns vehicle availability and rental orchestration, while Pricing Service owns database-driven pricing rules. The Angular UI calls Fleet, Fleet calls Pricing synchronously through RestTemplate, and MyBatis handles database access. The rental flow validates the request, loads the truck, calculates rental duration, obtains the pricing quote, invokes a database stored procedure to transition the truck into the rented state, and persists the rental record inside a transactional service method. Validation and centralized exception handling provide consistent API behavior."

---

# 50. Final Architecture Summary

```text
                          ┌──────────────────────┐
                          │      Angular 20      │
                          │ Pricing Calculator    │
                          └──────────┬───────────┘
                                     │
                                     │ HTTP
                                     ▼
                          ┌──────────────────────┐
                          │   Fleet Service      │
                          │      :8081           │
                          │                      │
                          │ Truck APIs           │
                          │ Rental APIs          │
                          │ Quote Orchestration  │
                          └───────┬───────┬──────┘
                                  │       │
                         MyBatis  │       │ RestTemplate
                                  │       │
                                  ▼       ▼
                          ┌──────────┐  ┌──────────────┐
                          │ Fleet DB │  │ Pricing      │
                          │          │  │ Service :8082│
                          │ TRUCK    │  │              │
                          │ RENTAL   │  │ Quote Engine │
                          └──────────┘  └──────┬───────┘
                                               │
                                               ▼
                                         ┌────────────┐
                                         │ Pricing DB │
                                         │            │
                                         │ Rate rules │
                                         └────────────┘
```

The architecture gives each service a clear business responsibility while still providing a complete end-to-end customer journey from quote request to truck rental.

---

## Source Repositories

- Fleet Service: https://github.com/deynitin96/fleet-service-demo
- Pricing Service: https://github.com/deynitin96/pricing-service-demo
- Angular UI: https://github.com/deynitin96/pricing-ui-angular

> This README documents the implementation currently present in the repositories' `main` branches. Where a database artifact such as the `rent_truck` stored procedure definition is referenced by application code but not stored in the repository, it is explicitly identified as an external database dependency.
