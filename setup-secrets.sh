#!/bin/bash

# This script sets up Firebase App Hosting secrets
# Run this from your project root

echo "Setting up Firebase App Hosting secrets..."
echo ""

# Firebase Private Key
echo "Setting firebase-private-key..."
echo "-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDBq2H+ymAZiUUR
++bqK+JLbCze2FGoovoEq0D0MOPYDhwOiyMBL12ZY5/MkNuVWsc/MmTSmmmtOEox
AXXqhzEPjZfvwZrpm2+bWQ4aRgRq7PE38eMvpC0/vd8vK8krWgGrIDV9lrVaqmeI
vJO2HnlOoLzJra6h46t7IlAqiNdAu+yTHC5VNCXO/bj6+0fgVoDTmLPfR3YV+mj8
ZttnXlhI24GWCZknHShF7zwsx+WJ4Td7H4vbIleOTxhpM2MKJNqJLUYyXI1cFc8i
iMEZae49GoP4zp3vPaRLUiouUxgi2db6E/5M5vHgfYh6N0/yU3uK0l+q0BYvRv83
dORwLZirAgMBAAECggEAEqIYziw0bZO9pH3pX20t2ynWPotVF/Xn1I+Rf60KG6oH
3J8myAdoAi9wNLAloEul0RiNIMIggFaV5/vtZDO+1NgMeGtwXYd9IaPCbct/9oJ2
sHZCVtdJ6NCtndrUAqrCb4kSyTmFy1C+OcBC/SOwPvaYebyPIusS5ZVaKmCuE3+W
FNEzFPV1npOm3w8d9PQmmvzg/xHQDalqwrStQQW1cWteLS39zERqHEtyICdnhgUA
B+p7C7P7HtKFrAOjR88jas+01NoGQ/aY1zGWi1w3eGjp6zJL7VdAL/1HSpZXRhs+
MGkI3qE07wZMG/gMBip5JurRp1AXigTAJaBCZgV60QKBgQD3IxMs6ba+fd9YxTyF
OZOJzslWqz/y54P2J2fVeyoAydT9vdPrjGknG99Ce+MnM7wu92yS+CgQLB2+oHEj
A+275Vyc+z5KhjL98AfKz3vVxtsMqNuMpjSy9xrj/G5ZWadmA18A6POjB2wJMsov
sqqsN/wTlOh2YSZ8k493JJd/uQKBgQDInW5SvElWwCQO0YUqFNci/9Q6hlNOz/u8
48f+0EoRfP64T2eiKSsgTuvEcJwyMSk6sQVDGKAlR4I21pUuHA6yd4w9bHbpJnua
d/xS8LuxfaVZ1QcmxPSc8a0/KxysaqBh7Fpd+bqyWXPqILIOoLCTcFSIRA2XY2sJ
jBidVH2lgwKBgEqqNijjk2qJ7OiM7nPxqTmBWCLvKirg92VvElfVFiOW1tqyd0w6
56oBKbqUY1R8tOYbqpncj34TVgk5v/SsQy75ZLmoznEFinJeCnyjou47XgK9IVek
/1bygRVQNqaYB5MygYls1+7xVxqQVbWDbT0KzQW9f14Ei/QnQLjmPT9BAoGAEMJu
LAVEzzWADajdShWxn1/l9/muzf+8FRymYZg/B9T8ZqNjkf2Ed8+ADMonkl3fBuMx
AFj3UAX4T+J/VfnMFIa+NYdxK6smWlI5xygLVhmcDbQpQ8jicpYSFhvg6lqCCYw4
RG+PdETa1S1kEqrD9Z1FwpiE1ifdElAc4k/jq0cCgYBJ6N272gz9n0K5t2vr9wqx
lEAETBu1stZtUyy0D4u8qswBxdfanXS9c99WtpyhGRidftkBLttYw40F/Km3b9HF
qo4oYWrTd/MOiNpZ+maFiswTbS3nNM1Mp1nOm2ew2yZ/6VRCOmwm7RRc/QElrlvR
eT4L1rC9mf70zSmm7cE79A==
-----END PRIVATE KEY-----" | firebase apphosting:secrets:set firebase-private-key

echo ""
echo "Setting cashfree-payouts-secret..."
echo "cfsk_ma_test_b648cbd880c81fc76cebbcb06d032103_0fb6d0d0" | firebase apphosting:secrets:set cashfree-payouts-secret

echo ""
echo "Setting cashfree-secret-key..."
echo "cfsk_ma_test_72a855984c17f9c8454b6751f3a40a37_f3873c2e" | firebase apphosting:secrets:set cashfree-secret-key

echo ""
echo "Setting cashfree-client-secret..."
echo "cfsk_ma_test_3566d846e803d78bd1469253352f4276_2f7babe0" | firebase apphosting:secrets:set cashfree-client-secret

echo ""
echo "✅ All secrets have been set!"
echo "Next step: Commit and push your apphosting.yaml to GitHub"
