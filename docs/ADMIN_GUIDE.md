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

- Only email addresses that have been given admin access can sign in. If your email isn't set up, no link is sent. Ask the person who manages the website to add you.
- Each link works once and expires after a short time. If it doesn't work, request a new one.
- To sign out, tap **Sign out** at the top of any admin page.

---

## 2. Adding a product

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

## 3. Uploading photos

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

## 4. Setting stock

**For one product:** open it, change **In stock** for each option, and tap **Save changes**.

**When restocking several items:** tap **Low stock**. It lists every option at or below its alert level, with the out-of-stock ones first. Type the new count next to an item and tap **Update**.

When an option reaches 0, the shop shows it as *Out of stock*, and shoppers can't add it to their cart.

**Lots of changes at once?** Use **Import / export**:

1. Tap **Download products CSV**.
2. Open it in Excel or Google Sheets and change the `stock` or `price_naira` columns.
3. Save it as CSV, then tap **Choose CSV file**.
4. Check the preview, then tap **Import**.

If there's a problem in the file, the preview lists the line and what to fix, and nothing is changed until you import a clean file.

---

## 5. Featuring a product on the homepage

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

## 6. Categories

Tap **Categories** to manage the menu.

- **Add category**: give it a name and choose where it sits (top level, or inside another category). Top-level categories also need an icon for the homepage tiles.
- Use the **arrows** to change the order shoppers see.
- Untick **Shown** to hide a category, and everything inside it, from the shop.
- **Unconfirmed** is just a reminder for you that a category isn't confirmed for launch yet. It doesn't hide anything.
- Tap the **pencil** to rename or move a category.

---

## 7. Removing the sample data

The shop started with **sample products** so it didn't look empty. They have a gold **Sample** badge in the admin.

When your own products are in:

1. Tap **Sample data**.
2. Tap **Remove all sample data…**
3. Decide about categories: leave **Also delete sample categories** **unticked** if you are using the starter categories (most shops will). Tick it only if you have built your own category list.
4. Type `REMOVE` in capitals and tap **Delete sample data**.

This deletes only items marked Sample, with their photos. Your own products are never touched. **It cannot be undone.**

To keep a sample product (for example, you sell it and have updated its price), open it, untick **Sample product**, and save before removing the sample data.

---

## Need help?

If you get stuck, contact the person who manages the website. Tell them which page you were on and what you tapped.
