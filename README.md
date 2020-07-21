# DesktopAPISample

> *Update July 21, 2020:*   
>
>Chrome 84 users must disable deprecation TLS 1.0/1.1 for the Desktop API to function with WebSockets. 
>
>Please open [about://flags](about://flags) in the address bar and change “Enforce deprecation of legacy TLS versions” to **Disabled**:
> 
> A pending client update of Bria 5, Bria 6, and Bria Enterprise will correct
> this issue by enabling TLS 1.2 for the Desktop API.
---
The Bria Desktop API allows third-party applications to control Bria for Windows and Bria for Mac softphone clients. By leveraging the Desktop API, third-party applications can perform commands such as starting an audio or video call, answering a call or placing a call on hold.

The Bria for Desktop API was originally used by CounterPath in conjunction with a Microsoft Outlook® Add-In, to enable Bria calls to be placed from within the Outlook® application. It has since been “hardened” for commercial use.

CounterPath is now encouraging third-party-application developers to integrate their applications with Bria. Suggested applications range from simple functions such as enabling click-to-call from web pages, to integration with sophisticated Call Center, Customer Relationship Management (CRM) and Health Care applications.

This project provides sample and convenient wrapper code to utilize this API. *Note* you will need a Bria desktop (Version 5.0 or higher, 5.3+ recommended) application to utilize the API.

This code is provided without support.  We welcome user contributions and comments.  Should you have any issues or questions, create an issue in the project and we respond on a best efforts basis.    

The Bria Desktop API Guide is available at:
https://www.counterpath.com/resources/bria-desktop-api 
