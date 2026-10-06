# Rajadhani Sales Order

Zoho ERP Sales Order creation widget adapted from the working Rajadhani invoice screen. The existing layout, customer and item search, barcode entry, packing ratios, quantities, taxes, discounts, rounding, addresses, salesperson, delivery fields and review flow are retained.

## Deployment

1. Authorize the existing `erp_admin` connection for Sales Orders. The manifest includes `ERP.salesorders.READ` and `ERP.salesorders.CREATE`, plus the customer/item/settings scopes used by lookups. Updating manifest text does not grant OAuth access: update and reauthorize the connection in Zoho. The original `userAccess: true` setting is retained.
2. In `app/config.json`, map custom fields to IDs belonging to **Sales Orders**. The copied configuration has blank IDs; as in the working screen, unmapped values are visibly marked and omitted from the payload. Keep the existing `salesOrderQuantityMode: "pieces"` unless your organization uses order units. Optional lookup sources and item packing mappings follow the existing screen.
3. Run `npm ci` and `npm run build`.
4. Upload `dist/RajadhaniSalesOrder.zip` in the Zoho ERP extension/widget configuration. It registers `salesorder.list.sidebar` and `salesorder.creation.sidebar` as modal widgets. The working `service: "ERP"`, SDK, API region and modal sizing are retained.
5. Authorize the connection for the current user and open **Rajadhani Sales Order** from Sales Orders. Turn off Developer Mode when using an uploaded package.
6. Verify one order in your organization: customer/items, custom fields, quantities, taxes, totals, automatic order number, permissions and redirect to the created Sales Order detail page.

Saving calls `POST /erp/v3/salesorders`, reads the `salesorder` response, locks the form after success and redirects the current browser tab to the new Sales Order detail page using the organization ID and returned `salesorder_id`. It does not call invoice creation, confirmation or email endpoints. Ambiguous save failures retain the original duplicate-prevention behavior.

The existing optional sales-order lookup remains in the same position, labelled **Copy from sales order**. Its original preview-only import restriction is retained because source order quantity semantics were not configured for live import. Pending-order information remains available. Source line IDs are never sent as invoice-conversion links when creating a new order.

## Files and checks

- `app/`: widget source, configuration and unchanged visual layout.
- `plugin-manifest.json`: Sales Order entry points and connection metadata.
- `dist/RajadhaniSalesOrder.zip`: uploadable package (no preview fixtures).
- `dist/index.html`: bundled production page.
- `dist/SalesOrderPreview.html`: offline demo with fictional data; saving disabled.
- `npm test`: core tests and browser tests; start `npm run preview` first (port 5179).
- `npm run zet:validate`: Zoho toolkit validation.

Live tenant saving cannot be verified by local mock tests. The separate invoice-edit project and old invoice build outputs were backed up outside this repository at `/private/tmp/rajadhani-invoice-backup-20261006`.

## Documentation reviewed

- [Zoho ERP widgets](https://www.zoho.com/erp/developer/widgets/)
- [Widget configuration](https://www.zoho.com/erp/developer/widgets/key-configuration.html)
- [Creation sidebar](https://www.zoho.com/finance/developer/widget-sdk-documentation/erp/v1/locations/creation-sidebar/)
- [List sidebar](https://www.zoho.com/finance/developer/widget-sdk-documentation/erp/v1/locations/list-sidebar/)
- [Sales Order REST API](https://www.zoho.com/erp/api/v3/sales-order/)

## Interstate GST

Tax selection compares place of supply against the selected business location's `address.state_code`, or the primary location/organization state when no location is selected. `sellerStateCode: "KL"` preserves this installation's original Kerala default only when the organization/primary location does not expose a state; set it to the actual seller state if different. An explicitly selected location with no state blocks saving until its state is available.

Interstate orders use the item's ERP `inter`/IGST preference and send its actual tax ID. Intrastate orders use the `intra` preference. Existing lines are recalculated when the customer, place of supply or location changes. If an item lacks the appropriate preference, only a unique same-rate tax of the correct jurisdiction may be used; otherwise saving is blocked until the tax is configured/selected. The dropdown excludes taxes of the opposite jurisdiction. No tax IDs are fabricated.
