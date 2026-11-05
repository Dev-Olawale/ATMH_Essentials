# ATMH Essentials: Admin Guide

This guide shows you how to run the shop from the admin area. Everything works on your phone.

The admin is at **your shop's address + `/admin`**, for example `https://atmhessentials.com/admin`.

---

## 1. Signing in

There is no password. You sign in with a link sent to your email.

1. Go to `/admin`.
2. Type your email address and tap **Email me a sign-in link**.
3. Open the email from the shop on the same phone or computer and tap the link.
4. You are now in the admin. You stay signed in on that device.

Good to know:

- Only email addresses that have been given admin access can sign in. If your email isn't set up, no link is sent. Ask the shop owner to add you (see **Team** below).
- There are two roles. **Owners** can do everything. **Staff** can manage products, categories and orders, but not the team, settings or sample data.
- Each link works once and expires after a short time. If it doesn't work, request a new one.
- To sign out, tap **Sign out** at the top of any admin page.

---

## 2. Orders

Every new order is emailed to you (see **Settings → Emails for new-order alerts**). The **Overview** page also shows tiles for **Orders awaiting a delivery fee**, **Payment proofs to review** and **Orders to pack**. Tap a tile to see those orders.

Open **Orders** to see everything. Tap **Needs action** for the orders waiting on you. You can search by order number (e.g. `ATMH-10023`), phone number or name, and filter by status or date.

### How an order moves along

| Status | What it means | What you do |
|---|---|---|
| **Awaiting delivery fee** | The customer has ordered. Delivery isn't priced yet. | Agree the fee with a rider, then enter it (below). |
| **Awaiting payment** | Bank transfer: the customer has their final total and our bank details. | Check your bank app. When the money is in, tap **Mark as paid**. |
| **Confirmed** | Pay on delivery: the customer knows their final total. | Pack the order. |
| **Paid** | The transfer has arrived. | Pack the order. |
| **Packed** | Ready for the rider. | Enter the rider's details and send it out. |
| **Out for delivery** | With the rider. | When it arrives, tap **Mark as delivered** (or **Delivered and paid** for pay on delivery). |
| **Delivered** | Done. | Nothing. |
| **Cancelled** | Stopped. The items went back into stock. | Refund the customer yourself if they had paid. |

The customer gets an email at each step: order received, final total, payment received, out for delivery, delivered, cancelled.

### Entering the delivery fee

1. Agree the fee with your rider.
2. Open the order. Under **Next step**, type the fee in naira (e.g. `2500`; use `0` for free delivery).
3. Tap **Confirm fee and email customer**.

The total updates and the customer is emailed their final total. Bank-transfer customers also get your bank details. If you entered the wrong fee, change it and tap **Update fee**; the customer gets a fresh email. You can do this until the order is paid or packed.

### Checking a bank transfer

Customers can upload a photo or PDF of their receipt, or type their transfer reference, on their order page. When they do, you get an email and the order shows **Proof to review**.

1. Open the order and tap the receipt to view it (only admins can open these).
2. **Always check your bank app.** A receipt can be faked.
3. When the money is there, tap **Mark as paid**. The customer is emailed.

### Sending it out

1. Pack the items. Tap **Packing slip** to print a checklist and the delivery address (it shows no prices, so it can go in the parcel). Then tap **Mark as packed**.
2. Enter the rider's name and phone, and optionally a note for the customer (e.g. "Arriving this afternoon").
3. Tap **Send out for delivery**. The customer is emailed the rider's details.

### Messaging a customer

On any order, tap **Message customer** to open WhatsApp with their number and a short message about their order already typed.

### Cancelling

Tap **Cancel order…**, give a short reason (the customer sees it) and confirm. The items go back into stock automatically. A delivered order can't be cancelled.

### Every change is recorded

The **History** on each order shows every status change, when it happened and who did it.

---

## 3. Adding a product

1. Tap **Products**, then **Add product**.
2. Fill in the **Details**:
   - **Product name**, for example *Ariel Detergent Powder*.
   - **Web address** is filled in for you from the name. You can leave it as it is.
   - **Brand** and **Description**. Keep the description short and helpful.
3. Fill in **Options, prices and stock**. Add one row for each size, scent or pack:
   - **Size / scent / pack**, for example *900g*, *Lavender* or *Pack of 3*.
   - **SKU** is your own code for this option, for example *ARL-900*. Each option needs a different SKU.
   - **Price (₦)**: type the price in naira, for example `2800` or `2,800`.
   - **Was (₦)** is optional. Use it for a sale: the old price shows crossed out. It must be higher than the price.
   - **In stock**: how many you have.
   - **Alert below**: when stock falls to this number, the option appears on the **Low stock** page.
   - Tap **Add another option** for more sizes.
4. Under **Categories**, tick every category the product belongs in. The first one you tick is its main category.
5. Tap **Create product**.

If something is missing or wrong, a message at the top tells you what to fix. Nothing you typed is lost.

---

## 4. Uploading photos

You add photos after creating the product, on the product's page.

1. Open the product (**Products**, then tap the product).
2. In **Photos**, tap **Add photos**. On a phone you can take a picture or choose several from your camera roll. On a computer you can also drag photos into the box.
3. Each photo shows a progress bar, then **Done**.

Tips:

- **Best results: square photo, plain light background, good lighting.**
- Photos up to 10MB are fine. We shrink them for you, so they load fast for shoppers.
- The **first** photo is the main one shown in the shop. Use the up and down arrows to change the order.
- Under each photo, type a short description (for example *Ariel 900g box, front*). It helps blind shoppers and Google.
- To remove a photo, tap the bin icon, then **Delete photo**.

---

## 5. Setting stock

**For one product:** open it, change **In stock** for each option, and tap **Save changes**.

**When restocking several items:** tap **Low stock**. It lists every option at or below its alert level, with the out-of-stock ones first. Type the new count next to an item and tap **Update**.

When an option reaches 0, the shop shows it as *Out of stock*, and shoppers can't add it to their cart.

Stock goes down automatically when a customer places an order, and back up if you cancel the order.

**Lots of changes at once?** Use **Import / export**:

1. Tap **Download products CSV**.
2. Open it in Excel or Google Sheets and change the `stock` or `price_naira` columns.
3. Save it as CSV, then tap **Choose CSV file**.
4. Check the preview, then tap **Import**.

If there's a problem in the file, the preview lists the line and what to fix, and nothing is changed until you import a clean file.

---

## 6. Featuring a product on the homepage

The homepage has two product rows:

- **Best Sellers** shows products you mark **Feature on the homepage** first, then products ticked **Bestseller**.
- **New In** shows products ticked **New**, newest first.

To feature a product:

1. Open the product.
2. Under **Homepage and visibility**, tick **Feature on the homepage**, and **Bestseller** or **New** if they apply.
3. Tap **Save changes**.

Changes show in the shop straight away. Each row shows up to 8 products.

**Hiding a product** without deleting it: untick **Show in the store**, or tap **Archive** at the top of the product page. Tap **Restore to store** to bring it back.

---

## 7. Categories

Tap **Categories** to manage the menu.

- **Add category**: give it a name and choose where it sits (top level, or inside another category). Top-level categories also need an icon for the homepage tiles.
- Use the **arrows** to change the order shoppers see.
- Untick **Shown** to hide a category, and everything inside it, from the shop.
- **Unconfirmed** is just a reminder for you that a category isn't confirmed for launch yet. It doesn't hide anything.
- Tap the **pencil** to rename or move a category.

---

## 8. Removing the sample data

The shop started with **sample products** so it didn't look empty. They have a gold **Sample** badge in the admin.

When your own products are in:

1. Tap **Sample data**.
2. Tap **Remove all sample data…**
3. Decide about categories: leave **Also delete sample categories** **unticked** if you are using the starter categories (most shops will). Tick it only if you have built your own category list.
4. Type `REMOVE` in capitals and tap **Delete sample data**.

This deletes only items marked Sample, with their photos. Your own products are never touched. **It cannot be undone.**

To keep a sample product (for example, you sell it and have updated its price), open it, untick **Sample product**, and save before removing the sample data.

---

## 9. Settings (owners only)

Tap **Settings**. Changes show in the shop straight away.

- **Store WhatsApp number**: used for the green WhatsApp button, "Order on WhatsApp" on products, and "Send order to WhatsApp" after checkout.
- **Emails for new-order alerts**: who gets new-order and payment-proof emails. Separate several with commas. Leave empty to alert every owner.
- **Bank details**: bank name, account name and 10-digit account number. Customers only see these after you confirm their delivery fee. Fill in all three, or leave all three empty. **Add these before taking bank-transfer orders.** The Overview page reminds you until you do.
- **Payment methods**: turn bank transfer and pay on delivery on or off.
- **States where pay on delivery is offered**: tick the states where riders can collect payment. Customers in other states only see bank transfer. Lagos is ticked to start with.
- **Announcement bar**: the thin black bar at the top of every page, e.g. "Nationwide delivery".
- **Delivery note**: shown at checkout, next to the order total.

---

## 10. Team (owners only)

Tap **Team** to see who can use the admin.

**To add someone:**

1. Type their email and choose **Staff** or **Owner**.
2. Tap **Give access**. They get an email telling them to sign in at `/admin` with that email address.

**To change someone's role**, tap **Make owner** or **Make staff**. **To remove someone**, tap **Remove access**, then **Yes, remove**. They lose access straight away. Any shopping account they have is kept.

Good to know:

- You can't remove or change yourself, and the shop always keeps at least one owner.
- Owners marked **Safety owner** are set by the person who manages the website, so nobody can get locked out. They can't be changed here.
- Customers who sign up to shop never get admin access unless an owner adds them here.

---

## Need help?

If you get stuck, contact the person who manages the website. Tell them which page you were on and what you tapped.
