#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PortalsStringPublisher, NSObject)
RCT_EXTERN_METHOD(publish:(NSString *)topic value:(NSString *)value)
@end
