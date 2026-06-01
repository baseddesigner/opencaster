## Summary

-

## Test plan

- [ ] `npm run check`
- [ ] `npm run smoke`
- [ ] `FARCASTER_PROVIDER=hypersnap npm run smoke` if provider behavior changed

## Safety checklist

- [ ] No secrets or `.env` files committed
- [ ] No browser-exposed provider keys
- [ ] No generic provider proxy added
- [ ] User/cast content remains escaped
- [ ] No app-side casts, likes, follows, signer custody, wallet flows, or payments added
- [ ] Docs updated if behavior changed
