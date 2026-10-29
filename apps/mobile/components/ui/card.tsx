import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { mobileTheme } from "../../constants/theme";

export interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Card({ style, children, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardHeaderProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function CardHeader({ style, children, ...props }: CardHeaderProps) {
  return (
    <View style={[styles.cardHeader, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardTitleProps extends TextProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function CardTitle({ style, children, ...props }: CardTitleProps) {
  return (
    <Text style={[styles.cardTitle, style]} {...props}>
      {children}
    </Text>
  );
}

export interface CardDescriptionProps extends TextProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function CardDescription({
  style,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <Text style={[styles.cardDescription, style]} {...props}>
      {children}
    </Text>
  );
}

export interface CardActionProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function CardAction({ style, children, ...props }: CardActionProps) {
  return (
    <View style={[styles.cardAction, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardContentProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function CardContent({ style, children, ...props }: CardContentProps) {
  return (
    <View style={[styles.cardContent, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardFooterProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function CardFooter({ style, children, ...props }: CardFooterProps) {
  return (
    <View style={[styles.cardFooter, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: mobileTheme.color.borderSoft,
    shadowColor: mobileTheme.color.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: mobileTheme.color.ink,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 11,
    color: mobileTheme.color.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  cardAction: {
    alignSelf: "flex-start",
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cardFooter: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: mobileTheme.color.borderSoft,
    flexDirection: "row",
    alignItems: "center",
  },
});
